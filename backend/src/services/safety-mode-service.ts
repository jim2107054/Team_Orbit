import { 
  CustomerSafetyModeRecord, SafetyModeState, SafetyModeReason, 
  SafetyModePolicyConfig, SafetyModeAuditEvent 
} from '../core/types.js';
import { auditService } from './audit-service.js';

export class CustomerSafetyModeService {
  private safetyModes: Map<string, CustomerSafetyModeRecord> = new Map();
  private auditEvents: SafetyModeAuditEvent[] = [];

  private config: SafetyModePolicyConfig = {
    normal_pause_verify_threshold: 0.60,
    normal_hold_assist_threshold: 0.85,
    protected_pause_verify_threshold: 0.40,
    protected_hold_assist_threshold: 0.70,
    max_extension_hours: 48
  };

  private reasonLabels: Record<SafetyModeReason, { bn: string; en: string }> = {
    SUSPICIOUS_CALL: {
      bn: 'সন্দেহজনক প্রতারণামূলক ফোন কল পেয়েছি',
      en: 'Suspicious scam call received'
    },
    PHONE_LOST: {
      bn: 'মোবাইল ফোন সাময়িক হারিয়ে গেছে / চুরি হয়েছে',
      en: 'Mobile phone temporarily lost or stolen'
    },
    SIM_REPLACEMENT: {
      bn: 'সাম্প্রতিক সিম পরিবর্তন বা বায়োমেট্রিক রিনিউ',
      en: 'Recent SIM replacement or biometric renewal'
    },
    UNEXPECTED_LOGIN: {
      bn: 'অচেনা ডিভাইস বা স্থানে সন্দেহজনক লগইন নোটিশ',
      en: 'Unexpected login notice from unfamiliar device'
    },
    FAMILY_PROTECTION: {
      bn: 'পরিবারের সদস্য বা বয়োজ্যেষ্ঠদের প্রতারণা থেকে সুরক্ষা',
      en: 'Family elder protection from social engineering'
    },
    VOLUNTARY_HIGH_PROTECTION: {
      bn: 'স্বেচ্ছায় সাময়িক সর্বোচ্চ সুরক্ষা চালু করা হয়েছে',
      en: 'Voluntary temporary high-protection safety mode'
    },
    OTHER: {
      bn: 'অন্যান্য নিরাপত্তা উদ্বেগ',
      en: 'Other general security concern'
    }
  };

  constructor() {
    this.seedDefaultCustomerState();
  }

  private seedDefaultCustomerState() {
    // Seed default demo wallet W-SYN-004512 in NORMAL state
    this.safetyModes.set('W-SYN-004512', {
      wallet_id: 'W-SYN-004512',
      state: 'NORMAL',
      active_since: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      remaining_seconds: 0,
      duration_minutes: 0,
      reason: 'VOLUNTARY_HIGH_PROTECTION',
      reason_label_bn: this.reasonLabels['VOLUNTARY_HIGH_PROTECTION'].bn,
      reason_label_en: this.reasonLabels['VOLUNTARY_HIGH_PROTECTION'].en,
      activation_source: 'CUSTOMER_APP',
      protections_enabled: [
        '৫০% কম থ্রেশহোল্ডে নতুন প্রাপকের ক্ষেত্রে সতর্কতা (Lower PAUSE_VERIFY threshold)',
        '৳৫,০০০-এর বেশি লেনদেনে অতিরিক্ত পিন যাচাই (Step-up verification for large transfers)',
        'অচেনা মার্চেন্ট কিউআর পেমেন্টে অতিরিক্ত নিরাপত্তা পর্যালোচনা (Merchant QR verification)',
        'গভীর রাতের লেনদেনে অতিরিক্ত কুলিং পিরিয়ড (Off-hours cooling window)',
        'রিস্ক ইঞ্জিন স্বয়ংক্রিয় সতর্কতা ও অ্যাসিস্ট হোল্ড (Pre-emptive assistance hold)'
      ],
      step_up_method_required: 'PIN',
      is_expired: true
    });
  }

  /**
   * Get Safety Mode record for a customer wallet, auto-checking expiry
   */
  getSafetyMode(walletId: string): CustomerSafetyModeRecord {
    let record = this.safetyModes.get(walletId);
    if (!record) {
      record = {
        wallet_id: walletId,
        state: 'NORMAL',
        active_since: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        remaining_seconds: 0,
        duration_minutes: 0,
        reason: 'VOLUNTARY_HIGH_PROTECTION',
        reason_label_bn: this.reasonLabels['VOLUNTARY_HIGH_PROTECTION'].bn,
        reason_label_en: this.reasonLabels['VOLUNTARY_HIGH_PROTECTION'].en,
        activation_source: 'CUSTOMER_APP',
        protections_enabled: [
          '৫০% কম থ্রেশহোল্ডে নতুন প্রাপকের ক্ষেত্রে সতর্কতা',
          '৳৫,০০০-এর বেশি লেনদেনে অতিরিক্ত পিন যাচাই',
          'অচেনা মার্চেন্ট কিউআর পেমেন্টে অতিরিক্ত পর্যালোচনা',
          'গভীর রাতের লেনদেনে অতিরিক্ত কুলিং পিরিয়ড'
        ],
        step_up_method_required: 'PIN',
        is_expired: true
      };
      this.safetyModes.set(walletId, record);
    }

    // Auto-Expiry check
    if (record.state === 'PROTECTED') {
      const now = Date.now();
      const expires = new Date(record.expires_at).getTime();
      const remainingSec = Math.max(0, Math.floor((expires - now) / 1000));
      record.remaining_seconds = remainingSec;

      if (remainingSec <= 0) {
        // Auto-expire
        record.state = 'NORMAL';
        record.is_expired = true;
        this.logAuditEvent(walletId, 'EXPIRY', 'PROTECTED', 'NORMAL', 'Auto-expired after configured duration', 'SYSTEM_TIMER');
      }
    }

    return record;
  }

  /**
   * Activate Customer Safety Mode voluntarily
   */
  async activateSafetyMode(
    walletId: string,
    reason: SafetyModeReason = 'SUSPICIOUS_CALL',
    durationMinutes: number = 120, // default 2 hours
    source: 'CUSTOMER_APP' | 'VOICE_CALL_SCAM_CHECK' | 'USSD' | 'AGENT_ASSIST' | 'HELPLINE' = 'CUSTOMER_APP'
  ): Promise<{ success: boolean; record: CustomerSafetyModeRecord; message: string }> {
    const prevState = this.getSafetyMode(walletId).state;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const labels = this.reasonLabels[reason] || this.reasonLabels['VOLUNTARY_HIGH_PROTECTION'];

    const record: CustomerSafetyModeRecord = {
      wallet_id: walletId,
      state: 'PROTECTED',
      active_since: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      remaining_seconds: durationMinutes * 60,
      duration_minutes: durationMinutes,
      reason,
      reason_label_bn: labels.bn,
      reason_label_en: labels.en,
      activation_source: source,
      protections_enabled: [
        'নতুন প্রাপকের ক্ষেত্রে কঠোর সতর্কতা ও যাচাইকরণ (PAUSE_VERIFY at 0.40 score)',
        '৳৫,০০০-এর বেশি যেকোনো লেনদেনে বাধ্যতামূলক স্টেপ-আপ পিন যাচাই',
        'অচেনা মার্চেন্ট কিউআর কোডে স্বয়ংক্রিয় ফ্রড স্ক্রিনিং',
        'সন্দেহজনক অ্যাকাউন্টে তাৎক্ষণিক ট্রানজেকশন হোল্ড (HOLD_ASSIST at 0.70 score)'
      ],
      step_up_method_required: 'PIN',
      is_expired: false
    };

    this.safetyModes.set(walletId, record);

    await this.logAuditEvent(
      walletId,
      'ACTIVATION',
      prevState,
      'PROTECTED',
      `Customer activated Safety Mode (${reason}) for ${durationMinutes} mins`,
      source
    );

    return {
      success: true,
      record,
      message: 'সুরক্ষা মোড সফলভাবে সক্রিয় করা হয়েছে (Safety Mode Activated)'
    };
  }

  /**
   * Extend active duration of Safety Mode
   */
  async extendSafetyMode(
    walletId: string,
    additionalMinutes: number = 120
  ): Promise<{ success: boolean; record: CustomerSafetyModeRecord; message: string }> {
    const record = this.getSafetyMode(walletId);
    if (record.state !== 'PROTECTED') {
      return { success: false, record, message: 'Safety Mode is not currently active' };
    }

    const currentExpiry = new Date(record.expires_at).getTime();
    const newExpiry = new Date(currentExpiry + additionalMinutes * 60 * 1000);
    record.expires_at = newExpiry.toISOString();
    record.duration_minutes += additionalMinutes;
    record.remaining_seconds = Math.max(0, Math.floor((newExpiry.getTime() - Date.now()) / 1000));
    record.is_expired = false;

    await this.logAuditEvent(
      walletId,
      'EXTENSION',
      'PROTECTED',
      'PROTECTED',
      `Extended Safety Mode by ${additionalMinutes} mins`,
      'CUSTOMER_APP'
    );

    return {
      success: true,
      record,
      message: `সুরক্ষা মোড আরও ${additionalMinutes} মিনিট বাড়ানো হয়েছে`
    };
  }

  /**
   * Disable Safety Mode with Step-Up Verification (Reversible)
   */
  async disableSafetyMode(
    walletId: string,
    stepUpPinOrOtp: string = '1234'
  ): Promise<{ success: boolean; record: CustomerSafetyModeRecord; message: string }> {
    const record = this.getSafetyMode(walletId);

    // Step-up verification validation
    const validPins = ['1234', '9821', '0000', '1122'];
    if (!validPins.includes(stepUpPinOrOtp.trim())) {
      return {
        success: false,
        record,
        message: 'স্টেপ-আপ ভেরিফিকেশন পিন ভুল হয়েছে (Invalid verification PIN/OTP)'
      };
    }

    const prevState = record.state;
    record.state = 'NORMAL';
    record.is_expired = true;
    record.remaining_seconds = 0;

    await this.logAuditEvent(
      walletId,
      'DISABLE',
      prevState,
      'NORMAL',
      'Customer passed step-up verification and disabled Safety Mode',
      'CUSTOMER_STEP_UP'
    );

    return {
      success: true,
      record,
      message: 'সুরক্ষা মোড বন্ধ করা হয়েছে (Safety Mode Disabled)'
    };
  }

  /**
   * Get dynamic policy thresholds for risk engine
   */
  getPolicyThresholds(walletId: string): {
    pauseVerifyThreshold: number;
    holdAssistThreshold: number;
    isProtected: boolean;
    state: SafetyModeState;
  } {
    const record = this.getSafetyMode(walletId);
    const isProtected = record.state === 'PROTECTED' && !record.is_expired;

    return {
      pauseVerifyThreshold: isProtected 
        ? this.config.protected_pause_verify_threshold 
        : this.config.normal_pause_verify_threshold,
      holdAssistThreshold: isProtected 
        ? this.config.protected_hold_assist_threshold 
        : this.config.normal_hold_assist_threshold,
      isProtected,
      state: record.state
    };
  }

  /**
   * Check if Safety Mode is active
   */
  isSafetyModeActive(walletId: string): boolean {
    const record = this.getSafetyMode(walletId);
    return record.state === 'PROTECTED' && !record.is_expired;
  }

  /**
   * Get System Safety Mode Configuration
   */
  getConfig(): SafetyModePolicyConfig {
    return this.config;
  }

  /**
   * Update Configurable Policy Thresholds
   */
  updateConfig(updates: Partial<SafetyModePolicyConfig>): SafetyModePolicyConfig {
    this.config = { ...this.config, ...updates };
    return this.config;
  }

  /**
   * Log Tamper-Evident Audit Event
   */
  private async logAuditEvent(
    walletId: string,
    eventType: 'ACTIVATION' | 'EXTENSION' | 'DISABLE' | 'EXPIRY',
    previousState: SafetyModeState,
    newState: SafetyModeState,
    reason: string = '',
    actor: string = 'CUSTOMER'
  ) {
    const event: SafetyModeAuditEvent = {
      event_id: `EVT-SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      wallet_id: walletId,
      event_type: eventType,
      previous_state: previousState,
      new_state: newState,
      reason,
      actor,
      timestamp: new Date().toISOString()
    };

    this.auditEvents.push(event);

    await auditService.logAction(
      actor,
      `CUSTOMER_SAFETY_MODE_${eventType}`,
      walletId,
      event
    );
  }

  /**
   * Get Safety Mode Audit History
   */
  getAuditHistory(walletId?: string): SafetyModeAuditEvent[] {
    if (walletId) {
      return this.auditEvents.filter(e => e.wallet_id === walletId);
    }
    return this.auditEvents;
  }
}

export const customerSafetyModeService = new CustomerSafetyModeService();
