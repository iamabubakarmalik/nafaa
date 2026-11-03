/**
 * Nafaa mobile design kit. Import everything from '@/design'.
 * See README.md in this folder for every component with an example.
 */

// Theme
export { ThemeProvider, ThemeOverride, useTheme, buildTheme, primeFirstFrame, type Theme } from './theme/ThemeProvider';
export { makeStyles } from './theme/makeStyles';
export { useAppearance, useAppearanceStore, getAppearance } from './theme/store';
export * from './theme/appearance';
export { useBundledFonts, loadGoogleFont } from './theme/fonts';
export { AppearanceBridge, appearanceApi, APPEARANCE_QUERY_KEY, type StoredAppearance } from './theme/AppearanceBridge';
export type { ThemeColors, StatusTone, Tone } from './theme/palette';

// Tokens
export * from './tokens/color';
export * from './tokens/presets';
export * from './tokens/typography';
export * from './tokens/layout';
export * from './tokens/surfaces';
export * from './tokens/hero';
export * from './tokens/motion';
export { industryIdentity, allIndustryIdentities, DEFAULT_IDENTITY, MARKETPLACE_IDENTITY, type IndustryIdentity } from './industries/identities';
export { industryIdForBusinessType, PACK_TO_BUSINESS_TYPE } from './industries/businessTypes';

// Brand
export { Logo, Wordmark } from './brand/Logo';
export { AppIntro } from './brand/AppIntro';
export { BrandLogo, ChannelLogo, brandColor, brandLabel, brandForChannel, brandForPayment, type BrandName } from './brand/BrandLogo';
export { NafaaAiMark } from './brand/NafaaAiMark';

// Components
export { Text, ltrIsolate, toneColor, type TextProps, type TextTone } from './components/Text';
export { Icon } from './components/Icon';
export { PressableScale } from './components/Pressable';
export { Button, IconButton, type ButtonVariant } from './components/Button';
export { Stack, Row, Spacer, Divider } from './components/Layout';
export { Card, SectionHeader } from './components/Card';
export { Badge, StatusPill } from './components/Badge';
export { Avatar, initials } from './components/Avatar';
export { Amount, type AmountProps } from './components/Amount';
export { Skeleton, SkeletonRows } from './components/Skeleton';
export { EmptyState, ErrorState } from './components/States';
export { ErrorBoundary } from './components/ErrorBoundary';
export { StatTile } from './components/StatTile';
export { KpiStrip, type KpiItem } from './components/KpiStrip';
export { SavedDataNote } from './components/SavedDataNote';
export { ListRow, ListGroup, ProgressBar } from './components/ListRow';
export { SwipeRow, type SwipeAction } from './components/SwipeRow';
export { Field, Input, TextArea, PasswordInput, MoneyInput, type InputProps } from './components/Input';
export { Switch, Checkbox } from './components/Toggle';
export { Sheet, SheetProvider, InSheetContext } from './components/Sheet';
export { Dialog, DialogHost, confirm, alert } from './components/Dialog';
export { toast, ToastHost } from './components/Toast';
export { SearchBar, useDebouncedValue } from './components/SearchBar';
export { Chip, ChipGroup, Segmented, type Option } from './components/Chips';
export { Tabs } from './components/Tabs';
export { Select, type SelectOption } from './components/Select';
export { DatePicker } from './components/DatePicker';
export { OtpInput } from './components/OtpInput';
export { Fab } from './components/Fab';
export * from './components/charts';
export { List, PullToRefresh } from './components/List';
export { Screen, ScreenHeader, LargeTitle, TAB_BAR_SPACE, useTabBarSpace, useScreenScroll, EmbeddedScreenContext } from './components/Screen';
export { SortableList, type SortableListProps } from './components/SortableList';
export { PageHero, HeroButton, HeroIconButton, HeroAmount, HeroText, HeroBackdrop, useHero, heroColors, type HeroStat } from './components/PageHero';
export { useLayout } from './components/useLayout';

// Screen templates (list, detail, form, settings): see README.md
export { ListTemplate, type ListTemplateProps } from './templates/ListTemplate';
export { DetailTemplate, DetailSection, DetailRow } from './templates/DetailTemplate';
export { FormTemplate, FormSection } from './templates/FormTemplate';
export { SettingsTemplate, SettingsGroup, SettingSwitch, SettingLink } from './templates/SettingsTemplate';
