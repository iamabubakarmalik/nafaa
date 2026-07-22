import {
  GraduationCap, Sparkles, Palette, AlertCircle, DollarSign,
  ToggleLeft, ToggleRight, Award, TrendingUp, Star, School,
  Zap, Users, Info,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import type {
  BookstoreWizardBookDetails, BookstoreWizardStationeryDetails,
  BookstoreWizardArtDetails, ProductType,
} from '../../hooks/useBookstoreWizard';

interface Props {
  productType: ProductType;
  book: BookstoreWizardBookDetails;
  stationery: BookstoreWizardStationeryDetails;
  art: BookstoreWizardArtDetails;
  onBookChange: (patch: Partial<BookstoreWizardBookDetails>) => void;
  onStationeryChange: (patch: Partial<BookstoreWizardStationeryDetails>) => void;
  onArtChange: (patch: Partial<BookstoreWizardArtDetails>) => void;
  onToggleSuitable: (item: string) => void;
  errors: string[];
}

const BOARDS = ['Sindh Board', 'Punjab Board', 'Federal Board', 'Aga Khan Board', 'KPK Board', 'Balochistan Board', 'Cambridge (O/A Level)', 'IB (International Baccalaureate)', 'Other'];
const GRADES = ['Play Group', 'Nursery', 'KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11 (First Year)', 'Class 12 (Second Year)', 'BA/BSc', 'MA/MSc', 'Professional'];
const SUBJECTS = ['Urdu', 'English', 'Math', 'Science', 'Physics', 'Chemistry', 'Biology', 'Computer', 'Islamiat', 'Pakistan Studies', 'History', 'Geography', 'Economics', 'Business', 'Accounts', 'General Knowledge', 'Arabic', 'Sindhi', 'Physical Education', 'Art', 'Other'];

const ART_SUITABLE_FOR = [
  'Beginners', 'Students', 'Professionals', 'Kids (5-10)', 'Kids (11-15)', 'Adults',
  'Fine Art', 'Poster Making', 'Fabric Painting', 'Wall Art', 'Portrait',
  'Landscape', 'Calligraphy', 'Sketching', 'Watercolor Techniques',
  'Oil Painting', 'Acrylic Painting', 'Crafts', 'DIY Projects', 'School Projects',
];

export function BookstoreWizardStep3Academic({
  productType, book, stationery, art,
  onBookChange, onStationeryChange, onArtChange, onToggleSuitable, errors,
}: Props) {
  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ═══════════ BOOK: Academic + Flags + Rental ═══════════ */}
      {productType === 'BOOK' && (
        <>
          {/* Academic Info */}
          <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-900 text-base leading-tight">Academic Info</h3>
                <p className="text-xs text-slate-500 font-semibold">Textbook hai to grade/subject/board</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={book.isTextbook}
                  onChange={(e) => onBookChange({ isTextbook: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
                <span className="text-sm font-extrabold text-blue-900">Is Textbook?</span>
              </label>
            </div>

            {book.isTextbook && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Board</label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-500"
                      value={book.board}
                      onChange={(e) => onBookChange({ board: e.target.value })}
                    >
                      <option value="">Select board</option>
                      {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Grade / Class</label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-500"
                      value={book.grade}
                      onChange={(e) => onBookChange({ grade: e.target.value })}
                    >
                      <option value="">Select grade</option>
                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject</label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-500"
                      value={book.subject}
                      onChange={(e) => onBookChange({ subject: e.target.value })}
                    >
                      <option value="">Select subject</option>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Input
                    label="Class Level (specific)"
                    value={book.classLevel}
                    onChange={(e) => onBookChange({ classLevel: e.target.value })}
                    placeholder="e.g. Section A"
                  />
                </div>

                <Input
                  label="Curriculum / Course"
                  value={book.curriculum}
                  onChange={(e) => onBookChange({ curriculum: e.target.value })}
                  placeholder="e.g. National Curriculum 2006"
                  hint="Course/curriculum name"
                />
              </>
            )}

            {!book.isTextbook && (
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 font-semibold">
                  Yeh general book hai — textbook nahi. Grade/subject skip ho jayega.
                </div>
              </div>
            )}
          </section>

          {/* Book Flags */}
          <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-amber-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base leading-tight">Marketing Flags</h3>
                <p className="text-xs text-slate-500 font-semibold">Best seller, new arrival, award-winner badges</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className={[
                'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
                book.isBestSeller ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300',
              ].join(' ')}>
                <input type="checkbox" checked={book.isBestSeller}
                  onChange={(e) => onBookChange({ isBestSeller: e.target.checked })} className="h-5 w-5 rounded" />
                <TrendingUp className={['h-5 w-5', book.isBestSeller ? 'text-emerald-600' : 'text-slate-400'].join(' ')} />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm">Best Seller</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Popular book</div>
                </div>
              </label>

              <label className={[
                'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
                book.isNewArrival ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300',
              ].join(' ')}>
                <input type="checkbox" checked={book.isNewArrival}
                  onChange={(e) => onBookChange({ isNewArrival: e.target.checked })} className="h-5 w-5 rounded" />
                <Sparkles className={['h-5 w-5', book.isNewArrival ? 'text-blue-600' : 'text-slate-400'].join(' ')} />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm">New Arrival</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Recently added</div>
                </div>
              </label>

              <label className={[
                'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
                book.isAwardWinner ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300',
              ].join(' ')}>
                <input type="checkbox" checked={book.isAwardWinner}
                  onChange={(e) => onBookChange({ isAwardWinner: e.target.checked })} className="h-5 w-5 rounded" />
                <Award className={['h-5 w-5', book.isAwardWinner ? 'text-amber-600' : 'text-slate-400'].join(' ')} />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm">Award Winner</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Won prize/award</div>
                </div>
              </label>
            </div>

            {book.isAwardWinner && (
              <Input
                label="Award Name"
                value={book.awardName}
                onChange={(e) => onBookChange({ awardName: e.target.value })}
                placeholder="e.g. Adamjee Award 2023, Nishan-e-Imtiaz"
                leftIcon={<Award className="h-4 w-4 text-amber-500" />}
              />
            )}
          </section>

          {/* Rental */}
          <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
            <div className="flex items-start gap-3 flex-wrap pb-2 border-b-2 border-violet-100">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Book Rental?</h3>
                <p className="text-sm text-slate-600 font-semibold mt-0.5">
                  Kya yeh kitaab rent bhi hoti hai library-style?
                </p>
              </div>
              <button
                type="button"
                onClick={() => onBookChange({ isRentable: !book.isRentable })}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
                  book.isRentable ? 'bg-violet-100 text-violet-800 hover:bg-violet-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {book.isRentable ? (<><ToggleRight className="h-5 w-5" /> Yes, rentable</>)
                  : (<><ToggleLeft className="h-5 w-5" /> No, sale only</>)}
              </button>
            </div>

            {book.isRentable && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Rental Price / Week (PKR) *"
                  type="number"
                  step="0.01"
                  value={book.rentalPricePerWeek}
                  onChange={(e) => onBookChange({ rentalPricePerWeek: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="50"
                  hint="Weekly rent"
                />
                <Input
                  label="Refundable Deposit (PKR)"
                  type="number"
                  step="0.01"
                  value={book.rentalDeposit}
                  onChange={(e) => onBookChange({ rentalDeposit: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="500"
                  hint="Safety deposit"
                />
              </div>
            )}
          </section>
        </>
      )}

      {/* ═══════════ STATIONERY: Usage Type ═══════════ */}
      {productType === 'STATIONERY' && (
        <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-100">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
              <School className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">Usage Type</h3>
              <p className="text-xs text-slate-500 font-semibold">Kis ke liye hai — school, office, ya fast-moving item</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className={[
              'flex items-center gap-3 cursor-pointer p-4 rounded-xl transition border-2',
              stationery.isSchoolItem ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300',
            ].join(' ')}>
              <input
                type="checkbox"
                checked={stationery.isSchoolItem}
                onChange={(e) => onStationeryChange({ isSchoolItem: e.target.checked })}
                className="h-5 w-5 rounded"
              />
              <School className={['h-6 w-6', stationery.isSchoolItem ? 'text-blue-600' : 'text-slate-400'].join(' ')} />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-900 text-sm">School Item</div>
                <div className="text-[10px] text-slate-500 font-semibold">Students ke liye</div>
              </div>
            </label>

            <label className={[
              'flex items-center gap-3 cursor-pointer p-4 rounded-xl transition border-2',
              stationery.isOfficeItem ? 'border-slate-700 bg-slate-100 shadow-md' : 'border-slate-200 hover:border-slate-400',
            ].join(' ')}>
              <input
                type="checkbox"
                checked={stationery.isOfficeItem}
                onChange={(e) => onStationeryChange({ isOfficeItem: e.target.checked })}
                className="h-5 w-5 rounded"
              />
              <div className={['h-6 w-6 rounded flex items-center justify-center text-lg', stationery.isOfficeItem ? '' : 'text-slate-400'].join(' ')}>
                💼
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-900 text-sm">Office Item</div>
                <div className="text-[10px] text-slate-500 font-semibold">Business/professional</div>
              </div>
            </label>

            <label className={[
              'flex items-center gap-3 cursor-pointer p-4 rounded-xl transition border-2',
              stationery.isFastMoving ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 hover:border-amber-300',
            ].join(' ')}>
              <input
                type="checkbox"
                checked={stationery.isFastMoving}
                onChange={(e) => onStationeryChange({ isFastMoving: e.target.checked })}
                className="h-5 w-5 rounded"
              />
              <Zap className={['h-6 w-6', stationery.isFastMoving ? 'text-amber-600' : 'text-slate-400'].join(' ')} />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-900 text-sm">Fast Moving</div>
                <div className="text-[10px] text-slate-500 font-semibold">Bahut jaldi bikta hai</div>
              </div>
            </label>
          </div>

          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 font-semibold">
              Fast-moving flag lagane se low-stock alerts prioritize hongay aur POS mein highlight hoga.
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ ART: Suitability ═══════════ */}
      {productType === 'ART_SUPPLY' && (
        <>
          <section className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white p-5 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-pink-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base leading-tight">Target User Level</h3>
                <p className="text-xs text-slate-500 font-semibold">Kis level ke artist ke liye hai</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className={[
                'flex items-center gap-3 cursor-pointer p-4 rounded-xl transition border-2',
                art.isBeginner ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-200 hover:border-emerald-300',
              ].join(' ')}>
                <input
                  type="checkbox"
                  checked={art.isBeginner}
                  onChange={(e) => onArtChange({ isBeginner: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
                <div className={['h-6 w-6 flex items-center justify-center text-xl', art.isBeginner ? '' : 'opacity-40'].join(' ')}>
                  🌱
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm">Beginner Friendly</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Students, learners</div>
                </div>
              </label>

              <label className={[
                'flex items-center gap-3 cursor-pointer p-4 rounded-xl transition border-2',
                art.isProfessional ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 hover:border-violet-300',
              ].join(' ')}>
                <input
                  type="checkbox"
                  checked={art.isProfessional}
                  onChange={(e) => onArtChange({ isProfessional: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
                <div className={['h-6 w-6 flex items-center justify-center text-xl', art.isProfessional ? '' : 'opacity-40'].join(' ')}>
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm">Professional Grade</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Fine artists, masters</div>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base leading-tight">Suitable For</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {art.suitableFor.length} tags selected — helps customers find right products
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ART_SUITABLE_FOR.map((item) => {
                const active = art.suitableFor.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onToggleSuitable(item)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition',
                      active
                        ? 'bg-pink-600 text-white border-pink-600 shadow'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-pink-300',
                    ].join(' ')}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
