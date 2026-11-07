import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HtmlSanitizerService } from '../common/html-sanitizer.service';
import { PeopleModule } from '../people/people.module';
import { Site, SiteSchema } from './schemas/site.schema';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Site.name, schema: SiteSchema }]),
    PeopleModule,
  ],
  controllers: [SitesController],
  providers: [SitesService, HtmlSanitizerService],
  exports: [SitesService, MongooseModule],
})
export class SitesModule {}
