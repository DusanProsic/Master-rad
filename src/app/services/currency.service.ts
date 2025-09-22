// currency.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CurrencyCode = 'RSD' | 'EUR' | 'USD'; // extend as needed
type Rates = Record<CurrencyCode, number>;

/**
 * ✅ Rates are ALWAYS relative to EUR (EUR = 1).
 * UI base (what you show on Dashboard) is separate and can be changed freely.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private keyUiBase = 'baseCurrency'; // UI selection (kept for compatibility)
  private keyRates  = 'fxRates';      // EUR-based rates

  // --- UI base (what the user sees) ---
  private uiBaseSubject = new BehaviorSubject<CurrencyCode>(this.readUiBase());
  /** Kept for compatibility with your code: */
  baseCurrency$ = this.uiBaseSubject.asObservable();
  get base(): CurrencyCode { return this.uiBaseSubject.value; }
  setBaseCurrency(next: CurrencyCode) {
    this.uiBaseSubject.next(next);
    localStorage.setItem(this.keyUiBase, next);
  }

  // --- Rates (ALWAYS EUR-based) ---
  private ratesSubject = new BehaviorSubject<Rates>(this.readRatesEURBase());
  rates$ = this.ratesSubject.asObservable();
  get rates(): Rates { return this.ratesSubject.value; }

  /** Replace the EUR-based map (EUR must be 1). */
  setRates(next: Rates) {
    if (!next || next.EUR !== 1) throw new Error('Rates must be EUR-based with EUR=1');
    this.ratesSubject.next(next);
    localStorage.setItem(this.keyRates, JSON.stringify(next));
  }

  /**
   * Convert amount FROM -> TO using EUR-based rates:
   * amount_in_EUR = amount / rate[from];  result = amount_in_EUR * rate[to]
   */
  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (!amount || from === to) return amount || 0;
    const rFrom = this.rates[from];
    const rTo   =  this.rates[to];
    if (!rFrom || !rTo) return amount;
    return (amount / rFrom) * rTo;
  }

  // --- storage helpers ---
  private readUiBase(): CurrencyCode {
    return (localStorage.getItem(this.keyUiBase) as CurrencyCode) ?? 'RSD';
  }

  private readRatesEURBase(): Rates {
    const saved = localStorage.getItem(this.keyRates);
    if (saved) return JSON.parse(saved);
    // sensible defaults (EUR=1)
    return {
      EUR: 1,
      USD: 1.08,
      RSD: 117.2,
    };
  }
}

localStorage.removeItem('fxRates');
localStorage.removeItem('baseCurrency');
