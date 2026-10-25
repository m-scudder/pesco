import {Platform} from 'react-native';
import Purchases, {type CustomerInfo, type PurchasesPackage} from 'react-native-purchases';

const PLUS_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || 'pesco_plus';
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
const PURCHASES_ENABLED = process.env.EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED === 'true';

let configured = false;
let configuredUserId: string | null = null;

export type PlusPlan = {
  id: string;
  title: string;
  price: string;
  period: 'annual' | 'monthly' | 'other';
  package: PurchasesPackage;
};

export function isPlusBillingConfigured(): boolean {
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : Platform.OS === 'android' ? ANDROID_API_KEY : undefined;
  return PURCHASES_ENABLED && Boolean(apiKey);
}

async function configureForUser(userId: string): Promise<void> {
  if (!isPlusBillingConfigured()) throw new Error('PESCO Plus purchases are not enabled yet. Billing setup is incomplete.');
  if (configured && configuredUserId === userId) return;
  if (configured) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
    return;
  }
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) throw new Error('RevenueCat API key is missing for this platform.');
  Purchases.configure({apiKey, appUserID: userId});
  configured = true;
  configuredUserId = userId;
}

function mapPackage(pkg: PurchasesPackage): PlusPlan {
  const id = pkg.identifier.toLowerCase();
  const period = id.includes('annual') || id.includes('year') ? 'annual'
    : id.includes('monthly') || id.includes('month') ? 'monthly' : 'other';
  return {
    id: pkg.identifier,
    title: pkg.product.title || (period === 'annual' ? 'Annual' : period === 'monthly' ? 'Monthly' : pkg.product.title),
    price: pkg.product.priceString,
    period,
    package: pkg,
  };
}

export async function getPlusPlans(userId: string): Promise<PlusPlan[]> {
  await configureForUser(userId);
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages.map(mapPackage).sort((a, b) => {
    if (a.period === 'annual' && b.period !== 'annual') return -1;
    if (b.period === 'annual' && a.period !== 'annual') return 1;
    return a.price.localeCompare(b.price);
  });
}

export async function purchasePlusPlan(userId: string, plan: PlusPlan): Promise<CustomerInfo> {
  await configureForUser(userId);
  const result = await Purchases.purchasePackage(plan.package);
  return result.customerInfo;
}

export async function getPlusCustomerInfo(userId: string): Promise<CustomerInfo> {\n  await configureForUser(userId);\n  return Purchases.getCustomerInfo();\n}\n\nexport async function restorePlusPurchases(userId: string): Promise<CustomerInfo> {
  await configureForUser(userId);
  return Purchases.restorePurchases();
}

export function hasActivePlusEntitlement(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PLUS_ENTITLEMENT_ID]);
}
