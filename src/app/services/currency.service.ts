import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CurrencyCode = 'RSD' | 'EUR' | 'USD'; // extend as needed

type Rates = Record<CurrencyCode, number>;
// All rates are relative to the baseCurrency
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private keyBase = 'baseCurrency';
  private keyRates = 'fxRates';

  // Base currency used for UI totals & charts
  private baseSubject = new BehaviorSubject<CurrencyCode>(this.readBase());
  baseCurrency$ = this.baseSubject.asObservable();

  // Simple rates map (1 base = rates[currency] units of that currency)
  private ratesSubject = new BehaviorSubject<Rates>(this.readRates());
  rates$ = this.ratesSubject.asObservable();

  get base(): CurrencyCode { return this.baseSubject.value; }
  get rates(): Rates { return this.ratesSubject.value; }

  setBaseCurrency(next: CurrencyCode) {
    this.baseSubject.next(next);
    localStorage.setItem(this.keyBase, next);
  }

  setRates(next: Rates) {
    this.ratesSubject.next(next);
    localStorage.setItem(this.keyRates, JSON.stringify(next));
  }

  /** Convert amount from -> to using current base/rates */
  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (!amount || from === to) return amount || 0;

    // Interpret rates as: 1 BASE = rates[currency] CURRENCY
    // Convert "from" to BASE, then BASE to "to"
    const r = this.rates;
    const base = this.base;

    // from -> BASE
    const amountInBase =
      from === base ? amount : amount / (r[from] || 1);

    // BASE -> to
    const out =
      to === base ? amountInBase : amountInBase * (r[to] || 1);

    return out;
  }

  // Defaults (pick whatever you like). Assume BASE=RSD.
  private readBase(): CurrencyCode {
    const saved = localStorage.getItem(this.keyBase) as CurrencyCode | null;
    return saved ?? 'RSD';
  }

  private readRates(): Rates {
    const saved = localStorage.getItem(this.keyRates);
    if (saved) return JSON.parse(saved);
    // Example defaults (update later / swap in API)
    // 1 RSD = 0.0085 EUR? No; our model: 1 BASE=RSD -> rates[currency]
    // So rates here mean: 1 RSD = X currency
    // Pick something stable-ish; you’ll replace later anyway.
    return {
      RSD: 1,        // always 1 for base
      EUR: 0.0085,   // 1 RSD ≈ 0.0085 EUR
      USD: 0.0093,   // 1 RSD ≈ 0.0093 USD
    };
  }
}
