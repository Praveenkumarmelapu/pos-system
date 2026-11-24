import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Store,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building2,
  Sparkles
} from 'lucide-react';

export function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1); // 1: Owner, 2: Shop Details, 3: Review & Submit
  const [formData, setFormData] = useState({
    ownerName: '',
    phone: '',
    email: '',
    password: '',
    shopName: '',
    businessCategory: 'Kirana & Grocery',
    gstin: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { registerShop } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError(null);

    if (currentStep === 1) {
      if (!formData.ownerName.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.password) {
        setError('Please complete all owner details.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.shopName.trim()) {
        setError('Please enter your shop name.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await registerShop(formData);
      if (result.success) {
        navigate('/onboarding', { replace: true });
      } else {
        setError(result.message || 'Unable to register the shop. Check your connection and try again.');
      }
    } catch (err) {
      const failure = err.response?.data?.error;
      setError(failure?.details?.map?.(detail => detail.message).filter(Boolean).join(' ') || failure?.message || 'Unable to register the shop. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step Indicator Header */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Step {currentStep} of 3</span>
          <span className="text-blue-600 font-extrabold">
            {currentStep === 1 && 'Owner Details'}
            {currentStep === 2 && 'Shop & Location'}
            {currentStep === 3 && 'Confirm & Create'}
          </span>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          {currentStep === 1 && 'Step 1 — Store Owner Details'}
          {currentStep === 2 && 'Step 2 — Shop Profile & Address'}
          {currentStep === 3 && 'Step 3 — Create Your Store Account'}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {currentStep === 1 && 'Your personal login credentials for secure access'}
          {currentStep === 2 && 'Details printed on customer thermal bills and invoices'}
          {currentStep === 3 && 'Review your details and initialize your retail POS terminal'}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Owner Details */}
      {currentStep === 1 && (
        <form onSubmit={handleNext} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Owner Full Name *
            </label>
            <div className="relative">
              <User className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                name="ownerName"
                required
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="e.g. Ramesh Sharma"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mobile Number (For WhatsApp / SMS alerts) *
            </label>
            <div className="relative">
              <Phone className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="98490 12345"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Login Email Address *
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="owner@yourkirana.in"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Create Password (min 6 chars) *
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-[0.99]"
          >
            <span>Next: Shop Details</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* STEP 2: Shop Details */}
      {currentStep === 2 && (
        <form onSubmit={handleNext} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Shop Name *
            </label>
            <div className="relative">
              <Store className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                name="shopName"
                required
                value={formData.shopName}
                onChange={handleChange}
                placeholder="e.g. Sri Balaji Supermarket & Kirana"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                name="businessCategory"
                value={formData.businessCategory}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="Kirana & Grocery">Kirana & Grocery</option>
                <option value="Supermarket">Supermarket</option>
                <option value="General Store">General Store</option>
                <option value="Stationery & Books">Stationery & Books</option>
                <option value="Cosmetics & Care">Cosmetics & Care</option>
                <option value="Bakery & Sweets">Bakery & Sweets</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="36AAAAA0000A1Z5"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Shop Street Address *
            </label>
            <div className="relative">
              <MapPin className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                name="address.street"
                required
                value={formData.address.street}
                onChange={handleChange}
                placeholder="Shop No. 4, Main Road, Market Area"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">City</label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">State</label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">PIN Code</label>
              <input
                type="text"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-3 px-4 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              <span>Review & Confirm</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Confirm & Launch Account */}
      {currentStep === 3 && (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Shop Name:</span>
              <span className="font-bold text-slate-900">{formData.shopName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-800">{formData.businessCategory}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Owner Name:</span>
              <span className="font-bold text-slate-900">{formData.ownerName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Phone & Login:</span>
              <span className="font-mono text-slate-800">{formData.phone} • {formData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Address:</span>
              <span className="text-slate-700 text-right truncate max-w-[200px]">
                {formData.address.street}, {formData.address.city}
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Your store account includes its own products, stock, sales and customer records.
            </p>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={loading}
              className="py-3 px-4 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? 'Setting up your store...' : 'Launch My Store Account'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Return to Login */}
      <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
        Already have a store account?{' '}
        <Link to="/login" className="font-bold text-blue-600 hover:underline">
          Sign In Here
        </Link>
      </div>
    </div>
  );
}
