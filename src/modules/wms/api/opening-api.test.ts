import { afterEach, describe, expect, it, vi } from 'vitest';
import { addOpeningLine, createOpeningDocument, listOpeningDocuments, postOpeningDocument } from './opening-api';

describe('opening inventory API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the Gateway WMS path and sends only authoritative reference IDs', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: '0', message: 'success', data: {} }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })));
    vi.stubGlobal('fetch', fetchMock);
    await createOpeningDocument('2001');
    expect(fetchMock.mock.calls[0]![0]).toBe('/wms/opening-documents');
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ warehouseId: '2001' });

    await listOpeningDocuments(2, 20);
    expect(fetchMock.mock.calls[1]![0]).toBe('/wms/opening-documents/search');
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]?.body))).toEqual({ params: {}, pageNo: 2, pageSize: 20 });

    await addOpeningLine('doc/1', { materialId: '1001', locationId: '3001', batchCode: 'REAL-LOT',
      snCode: null, quantity: '2.50', qualityStatus: 'QUALIFIED', warehouseStatus: 'NORMAL' });
    expect(fetchMock.mock.calls[2]![0]).toBe('/wms/opening-documents/doc%2F1/lines');
    expect(JSON.parse(String(fetchMock.mock.calls[2]![1]?.body))).toEqual({ materialId: '1001', locationId: '3001',
      batchCode: 'REAL-LOT', snCode: null, quantity: '2.50', qualityStatus: 'QUALIFIED', warehouseStatus: 'NORMAL' });
  });

  it('confirms posting with a single non-retried request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: '0', message: 'success', data: {} }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    await postOpeningDocument('doc-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('/wms/opening-documents/doc-1/post');
    expect(fetchMock.mock.calls[0]![1]?.method).toBe('POST');
  });
});
