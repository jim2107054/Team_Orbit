import { UserSegment, PeriodType, TemporalContext, TemporalFeatures, TxnType } from '../core/types.js';

export interface CalendarEventConfig {
  id: string;
  name: string;
  period_type: PeriodType;
  start_date: string; // MM-DD or YYYY-MM-DD
  end_date: string;   // MM-DD or YYYY-MM-DD
  is_festival: boolean;
}

export class TemporalRiskIntelligenceService {
  // Configurable Synthetic Bangladesh Calendar (Configurable to prevent hardcoded religious date obsolescence)
  private calendarEvents: CalendarEventConfig[] = [
    {
      id: 'EVT-RAMADAN-2026',
      name: 'Holy Month of Ramadan',
      period_type: 'RAMADAN',
      start_date: '02-18',
      end_date: '03-19',
      is_festival: true
    },
    {
      id: 'EVT-EID-FITR-2026',
      name: 'Eid-ul-Fitr Holiday & Shopping Window',
      period_type: 'EID_FITR',
      start_date: '03-20',
      end_date: '03-27',
      is_festival: true
    },
    {
      id: 'EVT-BOISHAKH-2026',
      name: 'Pohela Boishakh (Bengali New Year 1433)',
      period_type: 'POHELA_BOISHAKH',
      start_date: '04-13',
      end_date: '04-15',
      is_festival: true
    },
    {
      id: 'EVT-EID-ADHA-2026',
      name: 'Eid-ul-Adha (Qurbani & Cattle Market)',
      period_type: 'EID_ADHA',
      start_date: '05-26',
      end_date: '06-02',
      is_festival: true
    },
    {
      id: 'EVT-PUJA-2026',
      name: 'Durga Puja Festival',
      period_type: 'PUJA_PERIOD',
      start_date: '10-01',
      end_date: '10-06',
      is_festival: true
    }
  ];

  // Segment Baseline Multipliers Matrix during Temporal Windows
  private segmentTemporalMultipliers: Record<UserSegment, Record<PeriodType, {
    amountMultiplier: number;
    velocityMultiplier: number;
    recipientEntropy: number;
    confidence: number;
  }>> = {
    merchant_owner: {
      EID_FITR: { amountMultiplier: 3.5, velocityMultiplier: 4.5, recipientEntropy: 0.90, confidence: 0.95 },
      EID_ADHA: { amountMultiplier: 4.0, velocityMultiplier: 3.8, recipientEntropy: 0.85, confidence: 0.95 },
      RAMADAN: { amountMultiplier: 2.2, velocityMultiplier: 2.5, recipientEntropy: 0.75, confidence: 0.90 },
      POHELA_BOISHAKH: { amountMultiplier: 2.8, velocityMultiplier: 3.0, recipientEntropy: 0.80, confidence: 0.90 },
      PUJA_PERIOD: { amountMultiplier: 2.5, velocityMultiplier: 2.8, recipientEntropy: 0.78, confidence: 0.90 },
      SALARY_DAY: { amountMultiplier: 1.8, velocityMultiplier: 2.0, recipientEntropy: 0.65, confidence: 0.85 },
      MONTH_END: { amountMultiplier: 1.4, velocityMultiplier: 1.5, recipientEntropy: 0.55, confidence: 0.80 },
      WEEKEND: { amountMultiplier: 1.5, velocityMultiplier: 1.8, recipientEntropy: 0.60, confidence: 0.85 },
      NORMAL_DAY: { amountMultiplier: 1.0, velocityMultiplier: 1.0, recipientEntropy: 0.50, confidence: 0.90 }
    },
    salaried: {
      EID_FITR: { amountMultiplier: 2.5, velocityMultiplier: 2.0, recipientEntropy: 0.80, confidence: 0.95 },
      EID_ADHA: { amountMultiplier: 3.0, velocityMultiplier: 2.2, recipientEntropy: 0.80, confidence: 0.95 },
      RAMADAN: { amountMultiplier: 1.5, velocityMultiplier: 1.4, recipientEntropy: 0.60, confidence: 0.90 },
      POHELA_BOISHAKH: { amountMultiplier: 1.8, velocityMultiplier: 1.5, recipientEntropy: 0.65, confidence: 0.90 },
      PUJA_PERIOD: { amountMultiplier: 1.8, velocityMultiplier: 1.5, recipientEntropy: 0.65, confidence: 0.90 },
      SALARY_DAY: { amountMultiplier: 2.8, velocityMultiplier: 2.5, recipientEntropy: 0.70, confidence: 0.95 },
      MONTH_END: { amountMultiplier: 1.2, velocityMultiplier: 1.1, recipientEntropy: 0.45, confidence: 0.85 },
      WEEKEND: { amountMultiplier: 1.3, velocityMultiplier: 1.2, recipientEntropy: 0.50, confidence: 0.85 },
      NORMAL_DAY: { amountMultiplier: 1.0, velocityMultiplier: 1.0, recipientEntropy: 0.40, confidence: 0.90 }
    },
    remittance_recipient: {
      EID_FITR: { amountMultiplier: 3.2, velocityMultiplier: 1.8, recipientEntropy: 0.75, confidence: 0.95 },
      EID_ADHA: { amountMultiplier: 3.5, velocityMultiplier: 2.0, recipientEntropy: 0.75, confidence: 0.95 },
      RAMADAN: { amountMultiplier: 2.0, velocityMultiplier: 1.5, recipientEntropy: 0.60, confidence: 0.90 },
      POHELA_BOISHAKH: { amountMultiplier: 1.6, velocityMultiplier: 1.3, recipientEntropy: 0.55, confidence: 0.85 },
      PUJA_PERIOD: { amountMultiplier: 1.8, velocityMultiplier: 1.4, recipientEntropy: 0.58, confidence: 0.88 },
      SALARY_DAY: { amountMultiplier: 1.5, velocityMultiplier: 1.3, recipientEntropy: 0.50, confidence: 0.80 },
      MONTH_END: { amountMultiplier: 1.3, velocityMultiplier: 1.2, recipientEntropy: 0.45, confidence: 0.80 },
      WEEKEND: { amountMultiplier: 1.2, velocityMultiplier: 1.1, recipientEntropy: 0.45, confidence: 0.80 },
      NORMAL_DAY: { amountMultiplier: 1.0, velocityMultiplier: 1.0, recipientEntropy: 0.40, confidence: 0.90 }
    },
    gig: {
      EID_FITR: { amountMultiplier: 2.2, velocityMultiplier: 2.5, recipientEntropy: 0.75, confidence: 0.90 },
      EID_ADHA: { amountMultiplier: 2.5, velocityMultiplier: 2.5, recipientEntropy: 0.75, confidence: 0.90 },
      RAMADAN: { amountMultiplier: 1.4, velocityMultiplier: 1.6, recipientEntropy: 0.60, confidence: 0.85 },
      POHELA_BOISHAKH: { amountMultiplier: 1.8, velocityMultiplier: 2.0, recipientEntropy: 0.68, confidence: 0.85 },
      PUJA_PERIOD: { amountMultiplier: 1.6, velocityMultiplier: 1.8, recipientEntropy: 0.65, confidence: 0.85 },
      SALARY_DAY: { amountMultiplier: 1.6, velocityMultiplier: 1.8, recipientEntropy: 0.60, confidence: 0.85 },
      MONTH_END: { amountMultiplier: 1.3, velocityMultiplier: 1.4, recipientEntropy: 0.50, confidence: 0.80 },
      WEEKEND: { amountMultiplier: 1.6, velocityMultiplier: 1.8, recipientEntropy: 0.60, confidence: 0.85 },
      NORMAL_DAY: { amountMultiplier: 1.0, velocityMultiplier: 1.0, recipientEntropy: 0.45, confidence: 0.90 }
    },
    farmer: {
      EID_FITR: { amountMultiplier: 2.0, velocityMultiplier: 1.5, recipientEntropy: 0.60, confidence: 0.88 },
      EID_ADHA: { amountMultiplier: 4.5, velocityMultiplier: 3.5, recipientEntropy: 0.85, confidence: 0.95 }, // Cattle sales
      RAMADAN: { amountMultiplier: 1.3, velocityMultiplier: 1.2, recipientEntropy: 0.50, confidence: 0.85 },
      POHELA_BOISHAKH: { amountMultiplier: 2.0, velocityMultiplier: 1.6, recipientEntropy: 0.65, confidence: 0.88 }, // Baisakhi harvest
      PUJA_PERIOD: { amountMultiplier: 1.5, velocityMultiplier: 1.3, recipientEntropy: 0.55, confidence: 0.85 },
      SALARY_DAY: { amountMultiplier: 1.2, velocityMultiplier: 1.1, recipientEntropy: 0.40, confidence: 0.80 },
      MONTH_END: { amountMultiplier: 1.2, velocityMultiplier: 1.1, recipientEntropy: 0.40, confidence: 0.80 },
      WEEKEND: { amountMultiplier: 1.4, velocityMultiplier: 1.3, recipientEntropy: 0.50, confidence: 0.80 },
      NORMAL_DAY: { amountMultiplier: 1.0, velocityMultiplier: 1.0, recipientEntropy: 0.35, confidence: 0.90 }
    },
    student: {
      EID_FITR: { amountMultiplier: 1.8, velocityMultiplier: 1.6, recipientEntropy: 0.70, confidence: 0.90 },
      EID_ADHA: { amountMultiplier: 1.6, velocityMultiplier: 1.4, recipientEntropy: 0.65, confidence: 0.90 },
      RAMADAN: { amountMultiplier: 1.2, velocityMultiplier: 1.2, recipientEntropy: 0.50, confidence: 0.85 },
      POHELA_BOISHAKH: { amountMultiplier: 1.5, velocityMultiplier: 1.4, recipientEntropy: 0.60, confidence: 0.85 },
      PUJA_PERIOD: { amountMultiplier: 1.4, velocityMultiplier: 1.3, recipientEntropy: 0.55, confidence: 0.85 },
      SALARY_DAY: { amountMultiplier: 1.6, velocityMultiplier: 1.5, recipientEntropy: 0.55, confidence: 0.85 }, // Pocket money allowance
      MONTH_END: { amountMultiplier: 0.9, velocityMultiplier: 0.8, recipientEntropy: 0.35, confidence: 0.85 },
      WEEKEND: { amountMultiplier: 1.4, velocityMultiplier: 1.3, recipientEntropy: 0.50, confidence: 0.85 },
      NORMAL_DAY: { amountMultiplier: 1.0, velocityMultiplier: 1.0, recipientEntropy: 0.40, confidence: 0.90 }
    }
  };

  /**
   * Configure calendar events dynamically
   */
  setCalendarEvents(events: CalendarEventConfig[]): void {
    this.calendarEvents = events;
  }

  /**
   * Determine Bangladesh temporal period for a specific point-in-time timestamp
   */
  getPeriodForTimestamp(isoTimestamp: string): {
    period_type: PeriodType;
    period_name: string;
    is_festival: boolean;
    is_salary_window: boolean;
    is_weekend: boolean;
  } {
    const d = new Date(isoTimestamp);
    const dayOfMonth = d.getDate();
    const dayOfWeek = d.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday in Bangladesh
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(dayOfMonth).padStart(2, '0');
    const mmdd = `${month}-${day}`;

    // 1. Check Festival/Event Calendar
    for (const evt of this.calendarEvents) {
      if (mmdd >= evt.start_date && mmdd <= evt.end_date) {
        return {
          period_type: evt.period_type,
          period_name: evt.name,
          is_festival: evt.is_festival,
          is_salary_window: false,
          is_weekend: isWeekend
        };
      }
    }

    // 2. Check Salary Window (1st to 5th of each month)
    if (dayOfMonth >= 1 && dayOfMonth <= 5) {
      return {
        period_type: 'SALARY_DAY',
        period_name: 'Monthly Salary Disbursement Window (1st-5th)',
        is_festival: false,
        is_salary_window: true,
        is_weekend: isWeekend
      };
    }

    // 3. Check Month-End Window (25th to end of month)
    if (dayOfMonth >= 25) {
      return {
        period_type: 'MONTH_END',
        period_name: 'Month-End Utility & Bill Settlement Period',
        is_festival: false,
        is_salary_window: false,
        is_weekend: isWeekend
      };
    }

    // 4. Check Weekend vs Normal Day
    if (isWeekend) {
      return {
        period_type: 'WEEKEND',
        period_name: 'Bangladesh Weekend (Friday-Saturday)',
        is_festival: false,
        is_salary_window: false,
        is_weekend: true
      };
    }

    return {
      period_type: 'NORMAL_DAY',
      period_name: 'Standard Weekday Baseline',
      is_festival: false,
      is_salary_window: false,
      is_weekend: false
    };
  }

  /**
   * Get Temporal Context for Customer Segment + Timestamp
   */
  getTemporalContext(
    isoTimestamp: string,
    segment: UserSegment = 'salaried'
  ): TemporalContext {
    const period = this.getPeriodForTimestamp(isoTimestamp);
    const segMultipliers = this.segmentTemporalMultipliers[segment] || this.segmentTemporalMultipliers.salaried;
    const config = segMultipliers[period.period_type] || segMultipliers.NORMAL_DAY;

    return {
      period_type: period.period_type,
      period_name: period.period_name,
      expected_amount_multiplier: config.amountMultiplier,
      expected_velocity_multiplier: config.velocityMultiplier,
      expected_recipient_entropy: config.recipientEntropy,
      confidence: config.confidence,
      is_festival: period.is_festival,
      is_salary_window: period.is_salary_window
    };
  }

  /**
   * Extract Point-in-Time Correct Temporal Features
   */
  computeTemporalFeatures(
    amountBdt: number,
    baselineAvgAmount: number,
    baselineStdAmount: number,
    recentCount1h: number,
    recipientCount24h: number,
    segment: UserSegment,
    isoTimestamp: string
  ): TemporalFeatures {
    const context = this.getTemporalContext(isoTimestamp, segment);

    const safeStd = baselineStdAmount > 0 ? baselineStdAmount : 1000;
    const safeAvg = baselineAvgAmount > 0 ? baselineAvgAmount : 2000;

    // 1. Seasonal Adjusted Expected Amount Mean & Z-score
    const seasonalExpectedMean = safeAvg * context.expected_amount_multiplier;
    const seasonalExpectedStd = safeStd * Math.sqrt(context.expected_amount_multiplier);
    const seasonalZScore = (amountBdt - seasonalExpectedMean) / seasonalExpectedStd;

    // 2. Period Adjusted Velocity
    const baseExpected1hVelocity = segment === 'merchant_owner' ? 4 : 1;
    const adjustedExpectedVelocity = Math.max(1, baseExpected1hVelocity * context.expected_velocity_multiplier);
    const periodAdjustedVelocity = Number((recentCount1h / adjustedExpectedVelocity).toFixed(2));

    // 3. Salary & Festival Deviations
    const salaryDayDeviation = context.is_salary_window 
      ? Math.max(0, (amountBdt - (safeAvg * context.expected_amount_multiplier)) / safeStd)
      : 0.0;

    const festivalDeviation = context.is_festival
      ? Math.max(0, (amountBdt - (safeAvg * context.expected_amount_multiplier)) / safeStd)
      : 0.0;

    // 4. Expected Recipient Deviation (Entropy)
    const expectedRecipients = Math.max(1, Math.round(5 * context.expected_recipient_entropy));
    const recipientDeviation = Math.abs(recipientCount24h - expectedRecipients) / expectedRecipients;

    // 5. Temporal Behavior Similarity (0.0 to 1.0)
    // Measures how well this transaction matches expected seasonal surge profile
    let similarity = 0.50;
    if (context.is_festival || context.is_salary_window) {
      if (amountBdt <= seasonalExpectedMean * 1.6 && recentCount1h <= adjustedExpectedVelocity * 1.5) {
        similarity = 0.92; // High legitimate seasonal alignment
      } else if (amountBdt > seasonalExpectedMean * 3.0) {
        similarity = 0.20; // Extreme anomaly even for festival
      } else {
        similarity = 0.65;
      }
    } else {
      similarity = amountBdt <= safeAvg * 2.0 ? 0.85 : 0.40;
    }

    return {
      seasonal_amount_zscore: Math.max(0, Number(seasonalZScore.toFixed(2))),
      period_adjusted_velocity: periodAdjustedVelocity,
      salary_day_deviation: Number(salaryDayDeviation.toFixed(2)),
      festival_deviation: Number(festivalDeviation.toFixed(2)),
      expected_recipient_deviation: Number(recipientDeviation.toFixed(2)),
      temporal_behavior_similarity: Number(similarity.toFixed(2)),
      temporal_context: context
    };
  }
}

export const temporalRiskIntelligence = new TemporalRiskIntelligenceService();
