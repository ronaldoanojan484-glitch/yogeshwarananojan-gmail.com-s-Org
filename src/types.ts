export type LanguageCode = 'en' | 'ta' | 'si';

export type PageView =
  | 'home'
  | 'store'
  | 'order'
  | 'reader-auth'
  | 'reader-view'
  | 'admin-login'
  | 'admin-dash';

export type StoreTab = 'book' | 'library' | 'word' | 'excel' | 'ppt';
export type ReaderCategory = 'book' | 'library' | 'word' | 'excel' | 'ppt';

export type OrderStatus = 'Pending' | 'Approved' | 'Revoked';

export type BookLockMode = 'paid' | 'full_lock' | 'free';
export type MainBookLockMode = 'preview_5' | 'strict_lock' | 'free_all';

export interface CustomBookPage {
  title: string;
  content: string;
}

export interface CustomBook {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  lockMode: BookLockMode;
  previewPages: number;
  pages: CustomBookPage[];
  createdAt: string;
}

export interface BankDetails {
  bank: string;
  branch: string;
  account_no: string;
  account_name: string;
}

export interface AppSettings {
  price_lkr: number;
  whatsapp: string;
  license: string;
  title: string;
  hero_tag: string;
  legal_notice: string;
  bank: BankDetails;
  mainBookLock?: MainBookLockMode;
  books?: CustomBook[];
}

export interface OrderRecord {
  id: string;
  paymentRef: string;
  name: string;
  phone: string;
  school: string;
  status: OrderStatus;
  createdAt: string;
}

export interface CustomerSession {
  id: string;
  name: string;
  phone: string;
  paymentRef: string;
  status: OrderStatus;
}

export interface TemplateItem {
  id: string;
  title: string;
  desc: string;
  text: string;
}

export interface ChapterItem {
  p: number;
  title: string;
}

export interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error';
}
