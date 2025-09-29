import React, { Component } from 'react';
import api from '../services/api'; // ✅ your centralized axios instance

class OpeningStock extends Component {
  state = {
    stocks: [],
    products: [],
    form: { productID: '', quantity: '', rate: '' },
    showModal: false,
    isEditing: false,
    editingId: null,
    error: ''
  };

  componentDidMount() {
    this.fetchStocks();
    this.fetchProducts();
  }

  fetchStocks = async () => {
    try {
      const res = await api.get('/OpeningStock'); // ✅ case-sensitive
      this.setState({ stocks: res.data });
    } catch {
      this.setState({ error: 'Error loading stocks.' });
    }
  };

  fetchProducts = async () => {
    try {
      const res = await api.get('/Product'); // ✅ match backend
      this.setState({ products: res.data });
    } catch {
      this.setState({ error: 'Error loading products.' });
    }
  };

  openForm = (stock = null) => {
    this.setState({
      form: stock
        ? { productID: stock.productID, quantity: stock.quantity, rate: stock.rate }
        : { productID: '', quantity: '', rate: '' },
      isEditing: !!stock,
      editingId: stock?.openingStockID || null,
      showModal: true,
      error: ''
    });
  };

  closeForm = () => {
    this.setState({
      form: { productID: '', quantity: '', rate: '' },
      isEditing: false,
      editingId: null,
      showModal: false
    });
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState(prev => ({
      form: { ...prev.form, [name]: value }
    }));
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { form, isEditing, editingId } = this.state;

    const payload = isEditing
      ? { openingStockID: editingId, ...form }
      : form;

    try {
      if (isEditing) {
        await api.put(`/OpeningStock/${editingId}`, payload);
      } else {
        await api.post('/OpeningStock', payload);
      }
      this.closeForm();
      this.fetchStocks();
    } catch {
      this.setState({ error: 'Error saving stock.' });
    }
  };

  render() {
    const { stocks, products, form, showModal, error } = this.state;

    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-between mb-3">
          <h4>Opening Stock</h4>
          <button className="btn btn-primary" onClick={() => this.openForm()}>+ Add Stock</button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <table className="table table-bordered table-hover">
          <thead className="thead-dark">
            <tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {stocks.map(s => (
              <tr key={s.openingStockID}>
                <td>{products.find(p => p.productID === s.productID)?.productName || '—'}</td>
                <td>{s.quantity}</td>
                <td>{s.rate}</td>
                <td>{(s.quantity * s.rate).toFixed(2)}</td>
                <td>
                  <button className="btn btn-sm btn-secondary me-2" onClick={() => this.openForm(s)}>Edit</button>
                </td>
              </tr>
            ))}
            {stocks.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center">No stock records available.</td>
              </tr>
            )}
          </tbody>
        </table>

        {showModal && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <form className="modal-content" onSubmit={this.handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">Opening Stock</h5>
                  <button type="button" className="btn-close" onClick={this.closeForm}></button>
                </div>
                <div className="modal-body">
                  <label>Product</label>
                  <select
                    name="productID"
                    className="form-control mb-2"
                    value={form.productID}
                    onChange={this.handleChange}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.productID} value={p.productID}>{p.productName}</option>
                    ))}
                  </select>

                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.01"
                    className="form-control mb-2"
                    value={form.quantity}
                    onChange={this.handleChange}
                    required
                  />

                  <label>Rate</label>
                  <input
                    type="number"
                    name="rate"
                    step="0.01"
                    className="form-control"
                    value={form.rate}
                    onChange={this.handleChange}
                    required
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={this.closeForm}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default OpeningStock;
