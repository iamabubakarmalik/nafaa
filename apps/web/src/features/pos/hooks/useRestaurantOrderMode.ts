import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ordersApi, type OrderMode, type OrderItem } from '@/features/industries/restaurant/api/orders.api';

export function useRestaurantOrderMode() {
  const [orderMode, setOrderMode] = useState<OrderMode>('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [numberOfGuests, setNumberOfGuests] = useState<number>(2);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const createOrderMutation = useMutation({
    mutationFn: async (payload: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      items: OrderItem[];
      discount?: number;
      serviceChargePct?: number;
      taxPct?: number;
      deliveryFee?: number;
      packagingFee?: number;
      tip?: number;
    }) => {
      return ordersApi.create({
        mode: orderMode,
        tableId: orderMode === 'DINE_IN' ? selectedTableId || undefined : undefined,
        customerId: payload.customerId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        numberOfGuests: orderMode === 'DINE_IN' ? numberOfGuests : undefined,
        deliveryAddress: orderMode === 'DELIVERY' ? deliveryAddress : undefined,
        deliveryNotes: orderMode === 'DELIVERY' ? deliveryNotes : undefined,
        specialRequests: specialRequests || undefined,
        serviceChargePct: payload.serviceChargePct,
        taxPct: payload.taxPct,
        discount: payload.discount,
        deliveryFee: payload.deliveryFee,
        packagingFee: payload.packagingFee,
        tip: payload.tip,
        items: payload.items,
      });
    },
    onSuccess: (order) => {
      toast.success('Restaurant order ' + order.orderNumber + ' created!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Order failed'),
  });

  const resetRestaurantState = () => {
    setSelectedTableId('');
    setNumberOfGuests(2);
    setDeliveryAddress('');
    setDeliveryNotes('');
    setSpecialRequests('');
  };

  return {
    orderMode,
    setOrderMode,
    selectedTableId,
    setSelectedTableId,
    numberOfGuests,
    setNumberOfGuests,
    deliveryAddress,
    setDeliveryAddress,
    deliveryNotes,
    setDeliveryNotes,
    specialRequests,
    setSpecialRequests,
    createOrder: createOrderMutation.mutate,
    creating: createOrderMutation.isPending,
    resetRestaurantState,
  };
}
