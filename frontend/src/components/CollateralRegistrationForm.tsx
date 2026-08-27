'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { signTransaction } from '@/lib/freighterClient';
import { submitSignedXdr } from '@/lib/stellarUtils';
import ConfirmDialog from '@/components/ConfirmDialog';
import { motion, useReducedMotion } from 'framer-motion';
import { submitVariants } from '@/lib/animations';
import { Input, Select, Button, Label, FieldError } from '@/components/ui';

interface Props {
  walletAddress: string;
  onSuccess?: (collateralId: string) => void;
}

interface FormData {
  animalType: string;
  quantity: string;
  weight: string;
  healthStatus: string;
  location: string;
  appraisedValue: string;
}

interface FormErrors {
  animalType?: string;
  quantity?: string;
  weight?: string;
  healthStatus?: string;
  location?: string;
  appraisedValue?: string;
  image?: string;
}

const ANIMAL_TYPES = ['cattle', 'goat', 'sheep'];
const HEALTH_STATUSES = ['excellent', 'good', 'fair', 'poor'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AUTO_SAVE_INTERVAL = 5000;
const STORAGE_KEY = 'stellarkraal_collateral_form';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function CollateralRegistrationForm({ walletAddress, onSuccess }: Props) {
  const reduced = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    animalType: 'cattle',
    quantity: '',
    weight: '',
    healthStatus: 'good',
    location: '',
    appraisedValue: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.walletAddress === walletAddress && parsed.data) {
          setShowRestorePrompt(true);
        }
      } catch {
        // ignore
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.quantity || formData.weight || formData.location || formData.appraisedValue) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ walletAddress, data: formData, timestamp: new Date().toISOString() })
        );
        setLastSaved(new Date());
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [formData, walletAddress]);

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const restoreSavedData = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) {
          setFormData(parsed.data);
          setShowRestorePrompt(false);
        }
      } catch {
        /* ignore */
      }
    }
  };

  const dismissRestore = () => {
    setShowRestorePrompt(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const validateField = useCallback((name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'quantity': {
        if (!value) return 'Quantity is required';
        const qty = parseInt(value);
        if (isNaN(qty) || qty <= 0) return 'Quantity must be a positive number';
        break;
      }
      case 'weight': {
        if (!value) return 'Estimated weight is required';
        const wt = parseFloat(value);
        if (isNaN(wt) || wt <= 0) return 'Weight must be a positive number';
        break;
      }
      case 'location':
        if (!value || value.trim().length === 0) return 'Location is required';
        if (value.trim().length < 3) return 'Location must be at least 3 characters';
        break;
      case 'appraisedValue': {
        if (!value) return 'Appraised value is required';
        const val = parseInt(value);
        if (isNaN(val) || val <= 0) return 'Appraised value must be a positive number';
        break;
      }
    }
    return undefined;
  }, []);

  const validateImage = (file: File): string | undefined => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPG, PNG, and WebP images are accepted';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'Image must be smaller than 5 MB';
    }
    return undefined;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setImageError(undefined);
      return;
    }

    const err = validateImage(file);
    if (err) {
      setImageError(err);
      setImageFile(null);
      setImagePreview(null);
      // Reset the input so the user can re-select
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImageError(undefined);
    setImageFile(file);
    // Revoke previous preview URL
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    (Object.keys(formData) as Array<keyof FormData>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowConfirm(true);
  };

  const registerCollateral = async () => {
    setLoading(true);
    setStatus(null);
    try {
      // Build multipart/form-data so the image travels alongside the other fields
      const body = new FormData();
      body.append('owner', walletAddress);
      body.append('animal_type', formData.animalType);
      body.append('count', formData.quantity);
      body.append('appraised_value', formData.appraisedValue);
      if (imageFile) {
        body.append('image', imageFile, imageFile.name);
      }

      const res = await fetch(`${API}/api/v1/collateral/register`, {
        method: 'POST',
        // Do NOT set Content-Type — the browser sets it automatically with the boundary
        body,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Registration failed');
      }
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, {
        network: process.env.NEXT_PUBLIC_NETWORK || 'TESTNET',
      });
      const result = await submitSignedXdr(signedTxXdr);
      setStatus(`Collateral registered successfully! ID: ${result}`);
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
      setFormData({
        animalType: 'cattle',
        quantity: '',
        weight: '',
        healthStatus: 'good',
        location: '',
        appraisedValue: '',
      });
      setErrors({});
      removeImage();
      onSuccess?.(result);
    } catch (e: unknown) {
      setStatus(`error:${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const isError = status?.startsWith('error:');

  return (
    <div className="bg-white rounded-2xl p-6 shadow space-y-4">
      {showRestorePrompt && (
        <div className="bg-gold-100 border border-gold-300 rounded-xl p-4">
          <p className="text-sm text-brown-700 mb-2">
            You have unsaved progress. Would you like to restore it?
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={restoreSavedData}>
              Restore
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissRestore}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-brown-700">Register Livestock Collateral</h2>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Select
          label="Animal Type"
          required
          value={formData.animalType}
          onChange={(e) => handleChange('animalType', e.target.value)}
          disabled={loading}
        >
          {ANIMAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </Select>

        <Input
          label="Quantity"
          required
          type="number"
          placeholder="Number of animals"
          value={formData.quantity}
          onChange={(e) => handleChange('quantity', e.target.value)}
          error={errors.quantity}
          disabled={loading}
        />

        <Input
          label="Estimated Weight (kg)"
          required
          type="number"
          step="0.1"
          placeholder="Average weight per animal"
          value={formData.weight}
          onChange={(e) => handleChange('weight', e.target.value)}
          error={errors.weight}
          disabled={loading}
        />

        <Select
          label="Health Status"
          required
          value={formData.healthStatus}
          onChange={(e) => handleChange('healthStatus', e.target.value)}
          disabled={loading}
        >
          {HEALTH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>

        <Input
          label="Location"
          required
          type="text"
          placeholder="Farm or region name"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          error={errors.location}
          disabled={loading}
        />

        <Input
          label="Appraised Value (stroops)"
          required
          type="number"
          placeholder="Total value in stroops"
          value={formData.appraisedValue}
          onChange={(e) => handleChange('appraisedValue', e.target.value)}
          error={errors.appraisedValue}
          disabled={loading}
        />

        {/* ── Image upload ────────────────────────────────────────────── */}
        <div>
          <Label htmlFor="livestock-image">
            Livestock Photo{' '}
            <span className="text-brown-400 font-normal text-xs">
              (optional · JPG / PNG / WebP · max 5 MB)
            </span>
          </Label>

          {imagePreview ? (
            /* Preview panel */
            <div className="mt-2 relative inline-block">
              <Image
                src={imagePreview}
                alt="Livestock preview"
                width={160}
                height={160}
                unoptimized
                className="h-40 w-auto max-w-full rounded-xl object-cover border border-brown-200"
              />
              <button
                type="button"
                onClick={removeImage}
                disabled={loading}
                aria-label="Remove image"
                className="absolute top-1 right-1 bg-white/90 hover:bg-white text-error rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow transition disabled:opacity-50"
              >
                ✕
              </button>
              <p className="mt-1 text-xs text-brown-500 truncate max-w-xs">{imageFile?.name}</p>
            </div>
          ) : (
            /* Upload trigger */
            <label
              htmlFor="livestock-image"
              className={`mt-2 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition
                ${
                  imageError
                    ? 'border-error bg-error/5 hover:bg-error/10'
                    : 'border-brown-300 bg-brown-50 hover:bg-brown-100'
                }
                ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <span className="text-3xl" aria-hidden="true">
                📷
              </span>
              <span className="text-sm text-brown-600 font-medium">Click to upload a photo</span>
              <span className="text-xs text-brown-400">JPG, PNG or WebP · up to 5 MB</span>
            </label>
          )}

          <input
            ref={fileInputRef}
            id="livestock-image"
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleImageChange}
            disabled={loading}
            className="sr-only"
            aria-describedby={imageError ? 'livestock-image-error' : undefined}
            aria-invalid={!!imageError}
          />

          {imageError && <FieldError id="livestock-image-error" message={imageError} />}
        </div>
        {/* ─────────────────────────────────────────────────────────────── */}

        <motion.div
          variants={reduced ? undefined : submitVariants}
          animate={loading ? 'loading' : 'idle'}
        >
          <Button type="submit" fullWidth loading={loading} disabled={loading || hasErrors}>
            {loading ? 'Processing…' : 'Register Collateral'}
          </Button>
        </motion.div>
      </form>

      {lastSaved && !loading && (
        <p className="text-xs text-brown-400 text-center">
          Auto-saved at {lastSaved.toLocaleTimeString()}
        </p>
      )}

      {status && (
        <div
          role="status"
          className={`p-3 rounded-xl text-sm ${
            isError ? 'bg-error-light text-error-dark' : 'bg-success-light text-success-dark'
          }`}
        >
          {isError ? status.replace('error:', '') : status}
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Register Collateral"
        message={`Register ${formData.quantity} ${formData.animalType}(s) with appraised value of ${formData.appraisedValue} stroops as on-chain collateral? This action cannot be undone.`}
        confirmLabel="Register"
        onConfirm={() => {
          setShowConfirm(false);
          registerCollateral();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
