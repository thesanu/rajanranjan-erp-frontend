import React, { useEffect, useState } from 'react';
import api from '../services/api';

const VoucherForm = ({ data, onClose }) => {
  const [form, setForm] = useState({
    voucherTypeID: '',
    voucherDate: '',
    voucherNo: '',
    narration: '',
    items: []
  });

  const [voucherTypes, setVoucherTypes] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [showProductFields, setShowProductFields] = useState(false);

  useEffect(() => {
    const fetchMasters = async () => {
      const [vtRes, lRes, pRes, tRes] = await Promise.all([
        api.get('/VoucherType'),
        api.get('/Ledger'),
        api.get('/Product'),
        api.get('/TaxRates')
      ]);
      setVoucherTypes(vtRes.data);
      setLedgers(lRes.data);
      setProducts(pRes.data);
      setTaxRates(tRes.data);
    };

    fetchMasters();

    if (data) {
      setForm({
        voucherTypeID: data.voucherTypeID || '',
        voucherDate: data.voucherDate?.split('T')[0] || '',
        voucherNo: data.voucherNo || '',
        narration: data.narration || '',
        items: data.items || []
      });

      const selectedType = data.voucherType?.voucherName?.toLowerCase();
      if (selectedType?.includes('sales') || selectedType?.includes('purchase') || selectedType?.includes('stock')) {
        setShowProductFields(true);
      }
    }
  }, [data]);

  const handleAddItem = () => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ledgerID: '',
          productID: '',
          quantity: 0,
          rate: 0,
          amount: 0,
          debit: 0,
          credit: 0,
          narration: '',
          taxRateID: ''
        }
      ]
    }));
  };

  const handleItemChange = (i, field, value) => {
    const items = [...form.items];
    items[i][field] = value;

    if (showProductFields && items[i].quantity && items[i].rate) {
      items[i].amount = parseFloat(items[i].quantity || 0) * parseFloat(items[i].rate || 0);
    }

    setForm({ ...form, items });
  };

  const cleanVoucherPayload = (voucher) => ({
  voucherID: data?.voucherID || 0,
  voucherNo: voucher.voucherNo || '',                // required — always include
  voucherTypeID: voucher.voucherTypeID ? parseInt(voucher.voucherTypeID) : 0,
  voucherDate: voucher.voucherDate,
  narration: voucher.narration || '',
  items: (voucher.items || []).map(item => ({
    // include both possible id names to match backend variants
    voucherItemID: item.voucherItemID || 0,
    itemID: item.itemID || item.ItemID || 0,

    // required foreign keys - ensure numbers (0 means invalid; backend should validate)
    ledgerID: item.ledgerID ? parseInt(item.ledgerID) : 0,
    productID: item.productID ? parseInt(item.productID) : (item.productID === 0 ? 0 : null),
    taxRateID: item.taxRateID ? parseInt(item.taxRateID) : null,

    // numeric fields
    quantity: item.quantity ? parseFloat(item.quantity) : 0,
    rate: item.rate ? parseFloat(item.rate) : 0,
    amount: item.amount ? parseFloat(item.amount) : (item.quantity && item.rate ? parseFloat(item.quantity) * parseFloat(item.rate) : 0),
    debit: item.debit ? parseFloat(item.debit) : 0,
    credit: item.credit ? parseFloat(item.credit) : 0,
    narration: item.narration || '',
    balanceType: (item.debit && parseFloat(item.debit) > 0) ? 'D' : ((item.credit && parseFloat(item.credit) > 0) ? 'C' : (item.balanceType || 'D'))
  }))
});

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Merge with original data to avoid accidentally dropping required top-level fields
    const payloadBase = {
      voucherID: data?.voucherID || 0,
      // ensure voucherNo exists — if empty, use data.voucherNo (existing)
      voucherNo: form.voucherNo || data?.voucherNo || '',
      voucherTypeID: form.voucherTypeID || data?.voucherTypeID,
      voucherDate: form.voucherDate || data?.voucherDate,
      narration: form.narration || data?.narration,
      items: form.items && form.items.length ? form.items : (data?.items || [])
    };

    const payload = cleanVoucherPayload(payloadBase);

    const url = data ? `/Voucher/${payload.voucherID}` : '/Voucher';
    const method = data ? api.put : api.post;
    await method(url, payload);
    onClose();
  } catch (err) {
    console.error('Save failed', err);
    alert('Failed to save voucher.');
  }
};


  const onVoucherTypeChange = (typeId) => {
    setForm({ ...form, voucherTypeID: typeId });
    const selected = voucherTypes.find(x => x.voucherTypeID == typeId);
    const isProductRelated = selected?.voucherName?.toLowerCase().includes('sales')
      || selected?.voucherName?.toLowerCase().includes('purchase')
      || selected?.voucherName?.toLowerCase().includes('stock');
    setShowProductFields(isProductRelated);
  };

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-lg">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">{data ? 'Edit' : 'New'} Voucher</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <select className="form-select mb-2" required value={form.voucherTypeID} onChange={e => onVoucherTypeChange(e.target.value)}>
              <option value="">Select Voucher Type</option>
              {voucherTypes.map(v => <option key={v.voucherTypeID} value={v.voucherTypeID}>{v.voucherName}</option>)}
            </select>

            <input type="date" className="form-control mb-2" required value={form.voucherDate} onChange={e => setForm({ ...form, voucherDate: e.target.value })} />
            <input type="text" className="form-control mb-2" value={form.voucherNo} onChange={e => setForm({ ...form, voucherNo: e.target.value })} placeholder="Voucher No" />
            <textarea className="form-control mb-2" value={form.narration} onChange={e => setForm({ ...form, narration: e.target.value })} placeholder="Narration" />

            <hr />
            <h6>Voucher Items</h6>
            {form.items.map((item, i) => (
              <div key={i} className="row mb-2">
                <div className="col-md-3">
                  <select className="form-select" required value={item.ledgerID} onChange={e => handleItemChange(i, 'ledgerID', e.target.value)}>
                    <option value="">Select Ledger</option>
                    {ledgers.map(l => <option key={l.ledgerID} value={l.ledgerID}>{l.ledgerName}</option>)}
                  </select>
                </div>

                {showProductFields && (
                  <>
                    <div className="col-md-2">
                      <select className="form-select" value={item.productID} onChange={e => handleItemChange(i, 'productID', e.target.value)}>
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.productID} value={p.productID}>{p.productName}</option>)}
                      </select>
                    </div>
                    <div className="col-md-1">
                      <input type="number" className="form-control" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(i, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-md-1">
                      <input type="number" className="form-control" placeholder="Rate" value={item.rate} onChange={e => handleItemChange(i, 'rate', e.target.value)} />
                    </div>
                  </>
                )}

                <div className="col-md-1">
                  <input type="number" className="form-control" placeholder="Debit" value={item.debit} onChange={e => handleItemChange(i, 'debit', e.target.value)} />
                </div>
                <div className="col-md-1">
                  <input type="number" className="form-control" placeholder="Credit" value={item.credit} onChange={e => handleItemChange(i, 'credit', e.target.value)} />
                </div>
                <div className="col-md-2">
                  <select className="form-select" value={item.taxRateID} onChange={e => handleItemChange(i, 'taxRateID', e.target.value)}>
                    <option value="">Tax Rate</option>
                    {taxRates.map(t => <option key={t.taxRateID} value={t.taxRateID}>{t.taxName} ({t.rate}%)</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-secondary mt-2" onClick={handleAddItem}>+ Add Item</button>

            <hr />
            <div className="text-end">
              <strong>Total Amount: ₹ {
                form.items.reduce((total, item) => {
                  const tax = taxRates.find(t => t.taxRateID == item.taxRateID)?.rate || 0;
                  const base = parseFloat(item.amount || 0);
                  const taxAmount = base * (tax / 100);
                  return total + base + taxAmount;
                }, 0).toFixed(2)
              }</strong>
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-success">Save</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoucherForm;
