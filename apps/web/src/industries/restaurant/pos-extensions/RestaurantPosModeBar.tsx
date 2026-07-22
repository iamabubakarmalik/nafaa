import { RestaurantModeBar } from '@industries/restaurant/pos-extensions/RestaurantModeBar';
import { useRestaurantOrderMode } from '@modules/pos/hooks/useRestaurantOrderMode';

/**
 * Restaurant POS Mode Bar — contributed to the core POS via
 * IndustryPack.pos.modeBar.
 *
 * Wraps the shared component + hook so the POS shell doesn\'t need to
 * know about restaurant-specific state. When the whole POS is refactored
 * to slot-based rendering, the underlying component / hook will be
 * moved into this pack folder as well.
 */
export function RestaurantPosModeBar() {
  const restaurantMode = useRestaurantOrderMode();
  return (
    <RestaurantModeBar
      orderMode={restaurantMode.orderMode}
      onChangeMode={restaurantMode.setOrderMode}
      selectedTableId={restaurantMode.selectedTableId}
      onSelectTable={restaurantMode.setSelectedTableId}
      numberOfGuests={restaurantMode.numberOfGuests}
      onChangeGuests={restaurantMode.setNumberOfGuests}
      deliveryAddress={restaurantMode.deliveryAddress}
      onChangeDeliveryAddress={restaurantMode.setDeliveryAddress}
      deliveryNotes={restaurantMode.deliveryNotes}
      onChangeDeliveryNotes={restaurantMode.setDeliveryNotes}
      specialRequests={restaurantMode.specialRequests}
      onChangeSpecialRequests={restaurantMode.setSpecialRequests}
    />
  );
}
