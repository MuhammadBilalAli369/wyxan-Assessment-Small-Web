import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateSiteDto } from './dto/create-site.dto';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(':address')
  findByAddress(@Param('address') address: string) {
    // Clients should encode path segments (e.g. library.zz%2Fstacks).
    return this.sitesService.findByAddress(decodeURIComponent(address));
  }

  @Post()
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }
}
