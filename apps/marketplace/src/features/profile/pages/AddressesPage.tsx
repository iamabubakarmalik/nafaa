import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Trash2, Star, Home, Briefcase, MapPinned } from 'lucide-react';
import { profileApi } from '../api/profile.api';
import { AddressSelector } from '@/features/checkout/components/AddressSelector';
import { Button, Card, Badge, EmptyState } from '@/ui';
import { toast } from 'sonner';

export default function AddressesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: profileApi.listAddresses,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => profileApi.deleteAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => profileApi.setDefaultAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
  });

  return (
    <>
      <Helmet><title>My Addresses — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
            <MapPin className="h-7 w-7 text-brand-600" />
            My Addresses
          </h1>
          <p className="text-sm text-content-muted mt-0.5">
            Manage your delivery addresses
          </p>
        </div>

        <AddressSelector onSelect={() => {}} />
      </div>
    </>
  );
}
