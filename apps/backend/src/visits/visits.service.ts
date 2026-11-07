import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { normalizeAddress } from '../common/address';
import { PeopleService } from '../people/people.service';
import { Site, SiteDocument } from '../sites/schemas/site.schema';
import { CreateVisitDto } from './dto/create-visit.dto';
import { Visit, VisitDocument } from './schemas/visit.schema';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private readonly visitModel: Model<VisitDocument>,
    @InjectModel(Site.name) private readonly siteModel: Model<SiteDocument>,
    private readonly peopleService: PeopleService,
  ) {}

  async findByPerson(personId: string) {
    if (!Types.ObjectId.isValid(personId)) {
      throw new BadRequestException('Invalid personId');
    }

    const person = await this.peopleService.findById(personId);
    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const visits = await this.visitModel
      .find({ personId: new Types.ObjectId(personId) })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean()
      .exec();

    return visits.map((v) => ({
      id: String(v._id),
      personId: String(v.personId),
      address: v.address,
      timestamp: new Date(v.timestamp).toISOString(),
      navigationType: v.navigationType,
      status: v.status,
      siteId: v.siteId ? String(v.siteId) : null,
      title: v.title ?? null,
    }));
  }

  async create(dto: CreateVisitDto) {
    const normalized = normalizeAddress(dto.address);
    if (!normalized.ok) {
      throw new BadRequestException(normalized.error);
    }

    if (!Types.ObjectId.isValid(dto.personId)) {
      throw new BadRequestException('Invalid personId');
    }

    const person = await this.peopleService.findById(dto.personId);
    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const site = await this.siteModel
      .findOne({ address: normalized.address })
      .lean()
      .exec();

    const status = dto.status ?? (site ? 'success' : 'not-found');

    // Back/forward restore prior page state in the client; we still record them
    // only when the frontend asks — assessment wants a visit log of arrivals.
    const created = await this.visitModel.create({
      personId: new Types.ObjectId(dto.personId),
      address: normalized.address,
      timestamp: new Date(),
      navigationType: dto.navigationType,
      status,
      siteId: site?._id ?? null,
      title: site?.title ?? (status === 'not-found' ? 'Not found' : null),
    });

    return {
      id: String(created._id),
      personId: String(created.personId),
      address: created.address,
      timestamp: created.timestamp.toISOString(),
      navigationType: created.navigationType,
      status: created.status,
      siteId: created.siteId ? String(created.siteId) : null,
      title: created.title ?? null,
    };
  }
}
