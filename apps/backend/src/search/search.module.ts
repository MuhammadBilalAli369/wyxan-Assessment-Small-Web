import { Module } from '@nestjs/common';
import { SitesModule } from '../sites/sites.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [SitesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
