import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { METRICS_SERVICE } from './interfaces/metrics-service.interface';
import type { IMetricsService } from './interfaces/metrics-service.interface';
import { CreateMetricDto, QueryMetricDto, ChartQueryDto } from './dto';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(METRICS_SERVICE) private readonly metricsService: IMetricsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new metric entry' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Metric created successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  create(@Body() dto: CreateMetricDto) {
    return this.metricsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List metrics by user and type with optional unit conversion',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics retrieved successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters.',
  })
  findAll(@Query() query: QueryMetricDto) {
    return this.metricsService.findAll(query);
  }

  @Get('chart')
  @ApiOperation({
    summary: 'Get chart data — latest metric value per day within a period',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chart data retrieved successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters.',
  })
  getChartData(@Query() query: ChartQueryDto) {
    return this.metricsService.getChartData(query);
  }
}
