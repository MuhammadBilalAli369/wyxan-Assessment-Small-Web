import { Injectable } from '@nestjs/common';
import createDOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';
import { sanitizePublishedHtml, type SanitizeResult } from '@small-web/shared';

@Injectable()
export class HtmlSanitizerService {
  private readonly purify = createDOMPurify;
  private readonly documentFactory = new JSDOM('').window.document
    .implementation;

  sanitize(dirty: string, titleHint?: string): SanitizeResult {
    return sanitizePublishedHtml(dirty, this.purify, {
      titleHint,
      documentFactory: this.documentFactory,
    });
  }
}
