export interface FairnessSlice {
  slice_name: string;
  category: 'GENDER' | 'LOCATION' | 'AGE_BAND' | 'ONBOARDING';
  total_samples: number;
  alert_rate_pct: number;
  fpr_pct: number;
  tpr_recall_pct: number;
  disparity_ratio: number;
  status: 'FAIR' | 'REVIEW_FLAG';
}

export interface DriftMetric {
  feature_name: string;
  psi_score: number;
  status: 'STABLE' | 'MODERATE_DRIFT' | 'SIGNIFICANT_DRIFT';
}

export class MonitoringService {
  getFairnessSlices(): FairnessSlice[] {
    return [
      {
        slice_name: 'Female Users',
        category: 'GENDER',
        total_samples: 48500,
        alert_rate_pct: 0.72,
        fpr_pct: 0.38,
        tpr_recall_pct: 84.5,
        disparity_ratio: 1.02,
        status: 'FAIR'
      },
      {
        slice_name: 'Male Users',
        category: 'GENDER',
        total_samples: 51500,
        alert_rate_pct: 0.76,
        fpr_pct: 0.41,
        tpr_recall_pct: 85.1,
        disparity_ratio: 1.05,
        status: 'FAIR'
      },
      {
        slice_name: 'Rural District Users',
        category: 'LOCATION',
        total_samples: 62000,
        alert_rate_pct: 0.81,
        fpr_pct: 0.45,
        tpr_recall_pct: 86.2,
        disparity_ratio: 1.12,
        status: 'FAIR'
      },
      {
        slice_name: 'Urban District Users',
        category: 'LOCATION',
        total_samples: 38000,
        alert_rate_pct: 0.69,
        fpr_pct: 0.36,
        tpr_recall_pct: 83.8,
        disparity_ratio: 0.94,
        status: 'FAIR'
      },
      {
        slice_name: 'Age 18-24 (Students)',
        category: 'AGE_BAND',
        total_samples: 28000,
        alert_rate_pct: 0.74,
        fpr_pct: 0.40,
        tpr_recall_pct: 84.0,
        disparity_ratio: 1.01,
        status: 'FAIR'
      },
      {
        slice_name: 'Age 50+ (Seniors)',
        category: 'AGE_BAND',
        total_samples: 19000,
        alert_rate_pct: 0.88,
        fpr_pct: 0.48,
        tpr_recall_pct: 87.5,
        disparity_ratio: 1.18,
        status: 'FAIR'
      },
      {
        slice_name: 'Agent Onboarding',
        category: 'ONBOARDING',
        total_samples: 54000,
        alert_rate_pct: 0.79,
        fpr_pct: 0.43,
        tpr_recall_pct: 85.0,
        disparity_ratio: 1.08,
        status: 'FAIR'
      },
      {
        slice_name: 'Direct App Onboarding',
        category: 'ONBOARDING',
        total_samples: 46000,
        alert_rate_pct: 0.71,
        fpr_pct: 0.37,
        tpr_recall_pct: 84.6,
        disparity_ratio: 0.96,
        status: 'FAIR'
      }
    ];
  }

  getDriftMetrics(): DriftMetric[] {
    return [
      { feature_name: 'amount_zscore_user', psi_score: 0.042, status: 'STABLE' },
      { feature_name: 'velocity_count_1h', psi_score: 0.038, status: 'STABLE' },
      { feature_name: 'hops_to_known_ring', psi_score: 0.089, status: 'STABLE' },
      { feature_name: 'balance_drain_ratio', psi_score: 0.051, status: 'STABLE' },
      { feature_name: 'device_change_flag', psi_score: 0.124, status: 'MODERATE_DRIFT' },
      { feature_name: 'risk_score_distribution', psi_score: 0.048, status: 'STABLE' }
    ];
  }
}

export const monitoringService = new MonitoringService();
