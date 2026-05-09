import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, Plus, Trash2, TrendingDown, CalendarDays, Receipt, Tag,
} from 'lucide-react';
import {
  expensesApi, expenseCategoriesApi,
} from '@/api/expenses.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function ExpensesPage() {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [description, setDescription] = useState('');
  const [newCatName, setNewCatName] = useState('');

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.list,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseCategoriesApi.list,
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary'],
    queryFn: expensesApi.summary,
  });

  const createExpense = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success('Expense save ho gayi');
      setTitle('');
      setAmount('');
      setDescription('');
      setCategoryId('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Expense save nahi hui');
    },
  });

  const deleteExpense = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      toast.success('Expense delete ho gayi');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const createCat = useMutation({
    mutationFn: expenseCategoriesApi.create,
    onSuccess: () => {
      toast.success('Category add ho gayi');
      setNewCatName('');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Category add nahi hui');
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-rose-700 via-red-700 to-orange-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Wallet className="h-3.5 w-3.5" />
              Money Out
            </div>
            <h2 className="mt-3 text-3xl font-bold">Expenses</h2>
            <p className="mt-2 text-sm text-white/80">
              Rent, bills, salaries — har kharcha track karo aur asli profit dekho.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aaj ke Expenses</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.todayExpenses ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aaj Count</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.todayCount ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Is Mahine</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.monthExpenses ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Expenses</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.totalExpenses ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[380px_1fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-xl font-bold text-slate-900">Naya Expense</h3>
            <p className="text-sm text-slate-500 mt-1">Quick expense add</p>

            <div className="space-y-4 mt-6">
              <Input
                label="Title"
                placeholder="Shop rent for May"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                label="Amount"
                type="number"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="CASH">Cash</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <Input
                label="Description (optional)"
                placeholder="Notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Button
                className="w-full"
                size="lg"
                loading={createExpense.isPending}
                onClick={() => {
                  if (!title.trim()) return toast.error('Title likhein');
                  if (!Number(amount)) return toast.error('Amount likhein');
                  createExpense.mutate({
                    title: title.trim(),
                    amount: Number(amount),
                    description: description.trim() || undefined,
                    categoryId: categoryId || undefined,
                    paymentMethod,
                  });
                }}
              >
                <Plus className="h-4 w-4" />
                Save Expense
              </Button>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900">Expense Categories</h3>
            <p className="text-sm text-slate-500 mt-1">Quick category creator</p>

            <div className="mt-4 flex gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Rent, Salary, Bills..."
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <Button
                onClick={() => {
                  if (!newCatName.trim()) return toast.error('Name likhein');
                  createCat.mutate({ name: newCatName.trim() });
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-white"
                  style={{ backgroundColor: c.color }}
                >
                  <Tag className="h-3 w-3" />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Recent Expenses</h3>
            <p className="text-sm text-slate-500">Latest 100 expenses</p>
          </div>

          {expenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Wallet className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi expense nahi</h4>
              <p className="mt-1 text-sm text-slate-500">Pehla expense save karein.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <div key={e.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: e.category?.color || '#64748b' }}
                    >
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{e.title}</div>
                      <div className="text-xs text-slate-500">
                        {e.category?.name || 'No category'} • {formatDate(e.expenseDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-rose-700">{formatPKR(e.amount)}</div>
                      <div className="text-xs text-slate-500">{e.paymentMethod}</div>
                    </div>
                    <button
                      onClick={() => deleteExpense.mutate(e.id)}
                      className="text-red-600 hover:bg-red-50 rounded-lg p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
