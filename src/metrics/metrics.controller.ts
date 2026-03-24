import {
  Controller,
  Post,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { METRICS_SERVICE } from './interfaces/metrics-service.interface';
import type { IMetricsService } from './interfaces/metrics-service.interface';
import { CreateMetricDto } from './dto';
import { ResponseEntity } from 'src/commons/dto/api-response';

@ApiTags('Metrics')
@Controller('api/metrics')
export class MetricsController {
  constructor(
    @Inject(METRICS_SERVICE) private readonly metricsService: IMetricsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new metric entry' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Metric created successfully.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input.' })
  create(@Body() dto: CreateMetricDto) {
    return ResponseEntity.success(this.metricsService.create(dto), 'Metric created successfully', HttpStatus.CREATED);
  }
}
