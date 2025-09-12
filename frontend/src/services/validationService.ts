// Validation Service for CCMIS Forms
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

class ValidationService {
  validateField(value: any, rules: ValidationRule): string | null {
    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      return 'This field is required';
    }

    // Skip other validations if value is empty and not required
    if (!value || value.toString().trim() === '') {
      return null;
    }

    const stringValue = value.toString();

    // Min length validation
    if (rules.minLength && stringValue.length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return 'Invalid format';
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }

  validateForm(data: Record<string, any>, rules: ValidationRules): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, fieldRules] of Object.entries(rules)) {
      const error = this.validateField(data[field], fieldRules);
      if (error) {
        errors[field] = error;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Predefined validation rules for common fields
  getEmailRules(): ValidationRule {
    return {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      custom: (value: string) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        return null;
      }
    };
  }

  getPasswordRules(): ValidationRule {
    return {
      required: true,
      minLength: 6,
      custom: (value: string) => {
        if (value && value.length < 6) {
          return 'Password must be at least 6 characters long';
        }
        return null;
      }
    };
  }

  getOptionalPasswordRules(): ValidationRule {
    return {
      required: false, // Password is optional for updates
      minLength: 6,
      custom: (value: string) => {
        if (value && value.length < 6) {
          return 'Password must be at least 6 characters long';
        }
        return null;
      }
    };
  }

  getPhoneRules(): ValidationRule {
    return {
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
      custom: (value: string) => {
        if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, ''))) {
          return 'Please enter a valid phone number';
        }
        return null;
      }
    };
  }

  getAgeRules(): ValidationRule {
    return {
      required: true,
      custom: (value: number) => {
        if (value && (value < 0 || value > 150)) {
          return 'Age must be between 0 and 150';
        }
        return null;
      }
    };
  }

  getCCNumberRules(): ValidationRule {
    return {
      required: true,
      pattern: /^[A-Za-z0-9\/\-_]+$/,
      custom: (value: string) => {
        if (value && !/^[A-Za-z0-9\/\-_]+$/.test(value)) {
          return 'CC Number can contain letters, numbers, slashes, hyphens, and underscores (e.g., fhi/cc/mbakpa/121)';
        }
        return null;
      }
    };
  }

  // Form-specific validation rules
  getLoginValidationRules(): ValidationRules {
    return {
      email: this.getEmailRules(),
      password: this.getPasswordRules()
    };
  }

  getUserValidationRules(): ValidationRules {
    return {
      fullName: { required: true, minLength: 2, maxLength: 100 },
      username: { required: true, minLength: 3, maxLength: 50 },
      email: this.getEmailRules(),
      password: this.getPasswordRules(),
      phoneNumber: this.getPhoneRules()
    };
  }

  getUserUpdateValidationRules(): ValidationRules {
    return {
      fullName: { required: true, minLength: 2, maxLength: 100 },
      username: { required: true, minLength: 3, maxLength: 50 },
      email: this.getEmailRules(),
      password: this.getOptionalPasswordRules(), // Password optional for updates
      phoneNumber: this.getPhoneRules()
    };
  }

  getHospitalValidationRules(): ValidationRules {
    return {
      name: { required: true, minLength: 2, maxLength: 100 },
      address: { required: true, minLength: 5, maxLength: 200 },
      city: { required: true, minLength: 2, maxLength: 50 },
      lga: { required: true, minLength: 2, maxLength: 50 },
      state: { required: true, minLength: 2, maxLength: 50 },
      country: { required: true, minLength: 2, maxLength: 50 },
      phone: this.getPhoneRules(),
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: (value: string) => {
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Please enter a valid email address';
          }
          return null;
        }
      }
    };
  }

  getPatientValidationRules(): ValidationRules {
    return {
      fullName: { required: true, minLength: 2, maxLength: 100 },
      ccNumber: this.getCCNumberRules(),
      age: this.getAgeRules(),
      gender: { required: true },
      phoneNumber: this.getPhoneRules(),
      address: { minLength: 5, maxLength: 200 },
      lga: { minLength: 2, maxLength: 50 },
      state: { minLength: 2, maxLength: 50 },
      country: { required: true, minLength: 2, maxLength: 50 }
    };
  }

  getConsultationValidationRules(): ValidationRules {
    return {
      patientId: { required: true },
      consultationType: { required: true },
      chiefComplaint: { required: true, minLength: 5, maxLength: 500 },
      consultationDate: { required: true },
      // optional but validated numeric ranges
      weightKg: { custom: (v: any) => (v !== '' && v != null && Number(v) < 0 ? 'Invalid weight' : null) },
      heightCm: { custom: (v: any) => (v !== '' && v != null && Number(v) < 0 ? 'Invalid height' : null) },
      temperatureC: { custom: (v: any) => (v !== '' && v != null && (Number(v) < 25 || Number(v) > 45) ? 'Unrealistic temperature' : null) },
      pulseBpm: { custom: (v: any) => (v !== '' && v != null && (Number(v) < 20 || Number(v) > 250) ? 'Unrealistic pulse' : null) },
      respirationRate: { custom: (v: any) => (v !== '' && v != null && (Number(v) < 5 || Number(v) > 80) ? 'Unrealistic respiration' : null) },
      bpSystolic: { custom: (v: any) => (v !== '' && v != null && (Number(v) < 50 || Number(v) > 300) ? 'Unrealistic systolic' : null) },
      bpDiastolic: { custom: (v: any) => (v !== '' && v != null && (Number(v) < 30 || Number(v) > 200) ? 'Unrealistic diastolic' : null) },
    };
  }

  getTaskValidationRules(): ValidationRules {
    return {
      title: { required: true, minLength: 3, maxLength: 100 },
      description: { minLength: 5, maxLength: 500 },
      priority: { required: true },
      assignedTo: { required: true },
      dueDate: { required: true }
    };
  }
}

// Create singleton instance
const validationService = new ValidationService();
export default validationService;
