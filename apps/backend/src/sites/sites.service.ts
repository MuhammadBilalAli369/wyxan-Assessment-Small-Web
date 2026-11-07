import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { normalizeAddress } from '../common/address';
import { HtmlSanitizerService } from '../common/html-sanitizer.service';
import { PeopleService } from '../people/people.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { Site, SiteDocument } from './schemas/site.schema';

@Injectable()
export class SitesService {
  constructor(
    @InjectModel(Site.name) private readonly siteModel: Model<SiteDocument>,
    private readonly sanitizer: HtmlSanitizerService,
    private readonly peopleService: PeopleService,
  ) {}

  private toDto(
    site:
      | SiteDocument
      | (Site & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date }),
  ) {
    const doc = site as Site & {
      _id: Types.ObjectId;
      createdAt: Date;
      updatedAt: Date;
    };
    return {
      id: String(doc._id),
      address: doc.address,
      title: doc.title,
      html: doc.html,
      authorId: String(doc.authorId),
      createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async findAll() {
    const sites = await this.siteModel.find().sort({ address: 1 }).exec();
    return sites.map((s) => this.toDto(s));
  }

  async findByAddress(rawAddress: string) {
    const normalized = normalizeAddress(rawAddress);
    if (!normalized.ok) {
      throw new BadRequestException(normalized.error);
    }

    const site = await this.siteModel
      .findOne({ address: normalized.address })
      .exec();
    if (!site) {
      throw new NotFoundException(`No site published at ${normalized.address}`);
    }
    return this.toDto(site);
  }

  async create(dto: CreateSiteDto) {
    const normalized = normalizeAddress(dto.address);
    if (!normalized.ok) {
      throw new BadRequestException(normalized.error);
    }

    const author = await this.peopleService.findById(dto.authorId);
    if (!author) {
      throw new BadRequestException('Unknown author');
    }

    const existing = await this.siteModel
      .findOne({ address: normalized.address })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Address ${normalized.address} is already published`,
      );
    }

    const sanitized = this.sanitizer.sanitize(dto.html, dto.title);

    try {
      const created = await this.siteModel.create({
        address: normalized.address,
        title: sanitized.title,
        html: sanitized.html,
        textContent: sanitized.textContent,
        authorId: new Types.ObjectId(dto.authorId),
        seedKey: `live:${normalized.address}`,
      });
      return this.toDto(created);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: number }).code === 11000
      ) {
        throw new ConflictException(
          `Address ${normalized.address} is already published`,
        );
      }
      throw err;
    }
  }
}
