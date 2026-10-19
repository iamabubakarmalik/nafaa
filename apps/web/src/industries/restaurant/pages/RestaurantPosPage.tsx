/**
 * The restaurant counter at /pos: cafe and fast-food quick mode. Orders are
 * taken at the counter with a token, sent to the kitchen and paid at once;
 * the next order starts straight away. Tables and running orders are on the
 * floor (/restaurant/tables).
 */

import { RequireShop } from '@modules/pos/components';
import { OrderComposer } from '../components/OrderComposer';

export default function RestaurantPosPage() {
  return (
    <RequireShop action="Counter par order lene">
      <OrderComposer counter />
    </RequireShop>
  );
}
