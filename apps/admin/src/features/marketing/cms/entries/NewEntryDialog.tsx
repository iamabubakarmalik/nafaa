/** "Naya" dialog: type, title, slug (auto from title), parent and PAGE template. */
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiErrorMessage, cmsApi, cmsKeys } from '@/api/marketing/marketing-cms.api';
import { CMS_ENTRY_TYPES, ENTRY_TYPE_META, PAGE_TEMPLATES, SLUG_PATTERN, type CmsEntryType, type PageTemplate } from '../contract/cms-contract';
import { slugify } from '../editor/lib';
import { EntryPicker } from '../fields/EntryPicker';
import { Btn, Grid, Modal, SelectField, TextField } from '../fields/ui';

const TEMPLATE_LABEL: Record<PageTemplate, string> = {
  home: 'Home',
  pricing: 'Pricing',
  hub: 'Hub (list page)',
  default: 'Default',
  legal: 'Legal',
  contact: 'Contact',
  roadmap: 'Roadmap',
};

export function NewEntryDialog({ open, onClose, types, locales }: { open: boolean; onClose: () => void; types: CmsEntryType[]; locales: string[] }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const choices = types.length ? types : [...CMS_ENTRY_TYPES];
  const [type, setType] = useState<CmsEntryType>(choices[0] as CmsEntryType);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [template, setTemplate] = useState<PageTemplate>('default');
  const [locale, setLocale] = useState(locales[0] ?? 'en');

  useEffect(() => {
    if (open) {
      setType(choices[0] as CmsEntryType);
      setTitle('');
      setSlug('');
      setSlugTouched(false);
      setParentId(null);
      setTemplate('default');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const meta = ENTRY_TYPE_META[type];
  const parentType = type === 'PAGE' ? 'PAGE' : meta.parentType;
  const effectiveSlug = slugTouched ? slug : slugify(title);
  const slugOk = effectiveSlug === '' ? false : SLUG_PATTERN.test(effectiveSlug) && effectiveSlug.length >= 2;
  const pathPreview = meta.pathPattern.replace('{slug}', effectiveSlug || '…');

  const create = useMutation({
    mutationFn: () =>
      cmsApi.createEntry({
        type,
        title: title.trim(),
        slug: effectiveSlug || undefined,
        parentId: parentId ?? undefined,
        locale,
        ...(type === 'PAGE' ? { data: { template } } : {}),
      }),
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: cmsKeys.entriesAll });
      toast.success('Draft ban gaya');
      onClose();
      nav(`/marketing/website/entries/${e.id}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const needsParent = type === 'CITY_INDUSTRY';
  const canCreate = title.trim().length > 0 && slugOk && (!needsParent || !!parentId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nayi entry"
      description="Draft banega; blocks type ke starter layout se aate hain"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" disabled={!canCreate} loading={create.isPending} onClick={() => create.mutate()}>
            Draft banayein
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Grid>
          <SelectField<CmsEntryType>
            label="Type"
            required
            value={type}
            onChange={(t) => {
              if (!t) return;
              setType(t);
              setParentId(null);
            }}
            options={choices.map((t) => ({ value: t, label: ENTRY_TYPE_META[t].label }))}
          />
          {type === 'PAGE' ? (
            <SelectField<PageTemplate> label="Template" value={template} onChange={(t) => t && setTemplate(t)} options={PAGE_TEMPLATES.map((t) => ({ value: t, label: TEMPLATE_LABEL[t] ?? t }))} />
          ) : locales.length > 1 ? (
            <SelectField label="Zaban" value={locale} onChange={(l) => l && setLocale(l)} options={locales.map((l) => ({ value: l, label: l.toUpperCase() }))} />
          ) : (
            <div />
          )}
        </Grid>
        <TextField label="Title" required value={title} onChange={setTitle} chars={{ max: 200 }} placeholder={type === 'INDUSTRY' ? 'Pharmacy' : type === 'CITY' ? 'Lahore' : 'Title'} />
        <TextField
          label="Slug"
          mono
          value={effectiveSlug}
          onChange={(v) => {
            setSlugTouched(true);
            setSlug(v.toLowerCase());
          }}
          error={effectiveSlug && !slugOk ? 'a-z, 0-9 aur hyphen, kam az kam 2 harf' : undefined}
          hint={<span className="font-mono">{pathPreview}</span>}
        />
        {parentType && (
          <EntryPicker
            label={needsParent ? 'Shehar (parent)' : 'Parent (optional)'}
            required={needsParent}
            types={[parentType]}
            value={parentId}
            onChange={setParentId}
            hint={type === 'PAGE' ? 'Path parent ke neeche banega' : undefined}
          />
        )}
      </div>
    </Modal>
  );
}
