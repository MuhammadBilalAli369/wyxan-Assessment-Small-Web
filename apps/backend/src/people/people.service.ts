import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person, PersonDocument } from './schemas/person.schema';

@Injectable()
export class PeopleService {
  constructor(
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
  ) {}

  async findAll() {
    const people = await this.personModel
      .find()
      .sort({ name: 1 })
      .lean()
      .exec();
    return people.map((p) => ({
      id: String(p._id),
      name: p.name,
    }));
  }

  async findById(id: string) {
    return this.personModel.findById(id).exec();
  }
}
