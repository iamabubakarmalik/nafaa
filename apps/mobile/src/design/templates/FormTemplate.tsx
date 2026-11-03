/**
 * Form screen template (new / edit): slim header, fields at form width,
 * inputs kept above the keyboard, a sticky Save bar, and a "discard changes?"
 * check when leaving with unsaved edits.
 *
 *   <FormTemplate
 *     title={isNew ? t('New product') : t('Edit product')}
 *     dirty={form.formState.isDirty}
 *     saving={save.isPending}
 *     onSave={form.handleSubmit((v) => save.mutate(v))}
 *     saveLabel={t('Save')}
 *   >
 *     <FormSection title={t('Basic')}>
 *       <Input label={t('Name')} … />
 *       <MoneyInput label={t('Price')} … />
 *     </FormSection>
 *   </FormTemplate>
 */

import { usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { confirm } from '../components/Dialog';

export interface FormTemplateProps {
  title: string;
  subtitle?: string;
  onSave: () => void;
  saving?: boolean;
  /** Unsaved changes: leaving asks first. */
  dirty?: boolean;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** Extra button beside Save (Delete on edit screens). */
  secondaryAction?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function FormTemplate({ title, subtitle, onSave, saving, dirty, saveLabel, saveDisabled, secondaryAction, actions, children }: FormTemplateProps) {
  const th = useTheme();
  const navigation = useNavigation();

  usePreventRemove(!!dirty && !saving, ({ data }) => {
    void confirm({
      title: t('Changes save nahi hue'),
      message: t('Bahar jayein to likha hua mit jayega.'),
      confirmLabel: t('Discard'),
      cancelLabel: t('Rukein'),
      tone: 'danger',
    }).then((leave) => {
      if (leave) navigation.dispatch(data.action);
    });
  });

  return (
    <Screen
      title={title}
      subtitle={subtitle}
      actions={actions}
      keyboard
      narrow
      footer={(
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          {secondaryAction}
          <Button size="lg" onPress={onSave} loading={saving} disabled={saveDisabled} style={{ flex: 1 }}>{saveLabel ?? t('Save')}</Button>
        </View>
      )}
    >
      {children}
    </Screen>
  );
}

/** A titled block of fields on a surface. */
export function FormSection({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(3), padding: th.space(4), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
      {(title || description) && (
        <View style={{ gap: 2 }}>
          {title && <Text size="md" weight="bold">{title}</Text>}
          {description && <Text size="sm" tone="muted">{description}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}
