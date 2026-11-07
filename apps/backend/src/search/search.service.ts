import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Site, SiteDocument } from '../sites/schemas/site.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Site.name) private readonly siteModel: Model<SiteDocument>,
  ) {}

  async search(q: string) {
    const query = (q ?? '').trim();
    if (!query) {
      return [];
    }
    if (query.length > 200) {
      throw new BadRequestException('Query is too long');
    }

    // Prefer MongoDB text index; fall back to case-insensitive substring on
    // extracted textContent / title so short queries and punctuation still work.
    let sites: SiteDocument[] = [];

    try {
      sites = await this.siteModel
        .find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(25)
        .exec();
    } catch {
      sites = [];
    }

    if (sites.length === 0) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      sites = await this.siteModel
        .find({
          $or: [{ textContent: re }, { title: re }, { address: re }],
        })
        .limit(25)
        .exec();
    }

    return sites.map((site) => ({
      id: String(site._id),
      address: site.address,
      title: site.title,
      excerpt: this.makeExcerpt(site.textContent, query),
    }));
  }

  private makeExcerpt(text: string, query: string): string {
    const hay = text || '';
    const idx = hay.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) {
      return hay.slice(0, 140) + (hay.length > 140 ? '…' : '');
    }
    const start = Math.max(0, idx - 40);
    const end = Math.min(hay.length, idx + query.length + 80);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < hay.length ? '…' : '';
    return prefix + hay.slice(start, end) + suffix;
  }
}
