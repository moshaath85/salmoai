export interface PaymentLogoConfig {
  id: string;
  name: string;
  nameAr: string;
  logoUrl: string;
  darkLogoUrl: string;
  category: 'gateway' | 'method' | 'bnpl';
  fallbackColor: string;
  isDefault: boolean;
}

const paymentLogos: PaymentLogoConfig[] = [
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    nameAr: 'آبل باي',
    logoUrl: 'https://developer.apple.com/assets/elements/icons/apple-pay/apple-pay.svg',
    darkLogoUrl: 'https://developer.apple.com/assets/elements/icons/apple-pay/apple-pay.svg',
    category: 'method',
    fallbackColor: '#000000',
    isDefault: true,
  },
  {
    id: 'google-pay',
    name: 'Google Pay',
    nameAr: 'جوجل باي',
    logoUrl: 'https://developers.google.com/static/pay/images/brand-guidelines/google-pay-mark.svg',
    darkLogoUrl: 'https://developers.google.com/static/pay/images/brand-guidelines/google-pay-mark.svg',
    category: 'method',
    fallbackColor: '#4285F4',
    isDefault: true,
  },
  {
    id: 'visa',
    name: 'Visa',
    nameAr: 'فيزا',
    logoUrl: '/assets/visa-logo.svg',
    darkLogoUrl: '/assets/visa-logo.svg',
    category: 'method',
    fallbackColor: '#1A1F71',
    isDefault: true,
  },
  {
    id: 'mastercard',
    name: 'MasterCard',
    nameAr: 'ماستركارد',
    logoUrl: '/assets/mastercard-logo.svg',
    darkLogoUrl: '/assets/mastercard-logo.svg',
    category: 'method',
    fallbackColor: '#EB001B',
    isDefault: true,
  },
  {
    id: 'mada',
    name: 'Mada',
    nameAr: 'مدى',
    logoUrl: '/assets/mada-logo.png',
    darkLogoUrl: '/assets/mada-logo.png',
    category: 'method',
    fallbackColor: '#003B5C',
    isDefault: true,
  },
  {
    id: 'tabby',
    name: 'Tabby',
    nameAr: 'تابي',
    logoUrl: 'https://checkout.tabby.ai/tabby-badge.png',
    darkLogoUrl: 'https://checkout.tabby.ai/tabby-badge.png',
    category: 'bnpl',
    fallbackColor: '#3BFFC0',
    isDefault: false,
  },
  {
    id: 'tamara',
    name: 'Tamara',
    nameAr: 'تمارا',
    logoUrl: 'https://cdn.tamara.co/assets/svg/tamara-logo-badge-en.svg',
    darkLogoUrl: 'https://cdn.tamara.co/assets/svg/tamara-logo-badge-en.svg',
    category: 'bnpl',
    fallbackColor: '#FF7B7B',
    isDefault: false,
  },
  {
    id: 'stc-pay',
    name: 'STC Pay',
    nameAr: 'STC Pay',
    logoUrl: '/assets/stc-pay-logo.png',
    darkLogoUrl: '/assets/stc-pay-logo.png',
    category: 'method',
    fallbackColor: '#4F008C',
    isDefault: false,
  },
  {
    id: 'paytabs',
    name: 'PayTabs',
    nameAr: 'بيتابس',
    logoUrl: 'https://site.paytabs.com/en/wp-content/uploads/sites/2/2023/04/paytabs-logo.svg',
    darkLogoUrl: 'https://site.paytabs.com/en/wp-content/uploads/sites/2/2023/04/paytabs-logo.svg',
    category: 'gateway',
    fallbackColor: '#00457C',
    isDefault: false,
  },
  {
    id: 'hyperpay',
    name: 'HyperPay',
    nameAr: 'هايبر باي',
    logoUrl: 'https://www.hyperpay.com/wp-content/uploads/2022/10/hyperpay_logo.svg',
    darkLogoUrl: 'https://www.hyperpay.com/wp-content/uploads/2022/10/hyperpay_logo.svg',
    category: 'gateway',
    fallbackColor: '#1E3A5F',
    isDefault: false,
  },
  {
    id: 'moyasar',
    name: 'Moyasar',
    nameAr: 'ميسر',
    logoUrl: 'https://moyasar.com/static/img/moyasar-logo.svg',
    darkLogoUrl: 'https://moyasar.com/static/img/moyasar-logo.svg',
    category: 'gateway',
    fallbackColor: '#2563EB',
    isDefault: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    nameAr: 'سترايب',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
    darkLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
    category: 'gateway',
    fallbackColor: '#635BFF',
    isDefault: false,
  },
];

export function getPaymentLogo(id: string): PaymentLogoConfig | undefined {
  return paymentLogos.find(logo => logo.id === id);
}

export function getAllPaymentLogos(): PaymentLogoConfig[] {
  return paymentLogos;
}

export function getPaymentLogosByCategory(category: 'gateway' | 'method' | 'bnpl'): PaymentLogoConfig[] {
  return paymentLogos.filter(logo => logo.category === category);
}

export function getDefaultPaymentLogos(): PaymentLogoConfig[] {
  return paymentLogos.filter(logo => logo.isDefault);
}