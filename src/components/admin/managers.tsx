'use client';

import { EntityList, type FieldDef } from './EntityList';
import {
  deleteCategoryAction, deleteColorAction, deleteSizeAction, saveCategoryAction, saveColorAction, saveSizeAction,
} from '@/domains/admin/catalog-actions';
import { deleteDiscountAction, saveDiscountAction } from '@/domains/admin/content-actions';

type V = Record<string, string | boolean>;

const categoryFields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Hoodies' },
  { key: 'displayOrder', label: 'Display order', type: 'number' },
  { key: 'description', label: 'Description (optional)', type: 'text', span: 2 },
  { key: 'isActive', label: 'Visible in store', type: 'switch' },
];

export function CategoriesManager({ items }: { items: V[] }) {
  return (
    <EntityList
      fields={categoryFields}
      items={items}
      blank={{ name: '', displayOrder: '0', description: '', isActive: true }}
      addLabel="Add category"
      summary={(v) => `${v.name}${v.isActive ? '' : ' (hidden)'} · ${v.count} products`}
      onSave={(v) => saveCategoryAction({ ...v, id: v.id || undefined })}
      onDelete={(id) => deleteCategoryAction(id)}
    />
  );
}

const sizeFields: FieldDef[] = [
  { key: 'name', label: 'Size code', type: 'text', placeholder: 'XL' },
  { key: 'displayName', label: 'Full name (optional)', type: 'text', placeholder: 'Extra Large' },
  { key: 'sortOrder', label: 'Sort order (small first)', type: 'number' },
  { key: 'isActive', label: 'Available', type: 'switch' },
];

export function SizesManager({ items }: { items: V[] }) {
  return (
    <EntityList
      fields={sizeFields}
      items={items}
      blank={{ name: '', displayName: '', sortOrder: '0', isActive: true }}
      addLabel="Add size"
      summary={(v) => `${v.name}${v.displayName ? ` · ${v.displayName}` : ''}${v.isActive ? '' : ' (off)'}`}
      onSave={(v) => saveSizeAction({ ...v, id: v.id || undefined })}
      onDelete={(id) => deleteSizeAction(id)}
    />
  );
}

const colorFields: FieldDef[] = [
  { key: 'name', label: 'Colour name', type: 'text', placeholder: 'Forest green' },
  { key: 'hexCode', label: 'Colour', type: 'color' },
  { key: 'isActive', label: 'Available', type: 'switch' },
];

export function ColorsManager({ items }: { items: V[] }) {
  return (
    <EntityList
      fields={colorFields}
      items={items}
      blank={{ name: '', hexCode: '#1f1f24', isActive: true }}
      addLabel="Add colour"
      summary={(v) => `${v.name} · ${v.hexCode}${v.isActive ? '' : ' (off)'}`}
      onSave={(v) => saveColorAction({ ...v, id: v.id || undefined })}
      onDelete={(id) => deleteColorAction(id)}
    />
  );
}

const discountFields: FieldDef[] = [
  { key: 'code', label: 'Code', type: 'text', placeholder: 'WELCOME10' },
  { key: 'type', label: 'Type', type: 'select', options: [{ value: 'PERCENTAGE', label: 'Percentage off' }, { value: 'FIXED_AMOUNT', label: 'Fixed amount (GHS)' }] },
  { key: 'value', label: 'Value', type: 'number', step: '0.01' },
  { key: 'minOrderAmount', label: 'Minimum order (GHS, optional)', type: 'number', step: '0.01' },
  { key: 'maxUses', label: 'Max uses (optional)', type: 'number' },
  { key: 'validUntil', label: 'Expires (optional)', type: 'date' },
  { key: 'isActive', label: 'Active', type: 'switch' },
];

export function DiscountsManager({ items }: { items: V[] }) {
  return (
    <EntityList
      fields={discountFields}
      items={items}
      blank={{ code: '', type: 'PERCENTAGE', value: '10', minOrderAmount: '', maxUses: '', validUntil: '', isActive: true }}
      addLabel="Add discount code"
      summary={(v) => `${v.code} · ${v.type === 'PERCENTAGE' ? `${v.value}%` : `GHS ${v.value}`} off · used ${v.used}${v.isActive ? '' : ' · inactive'}`}
      onSave={(v) =>
        saveDiscountAction({
          ...v,
          id: v.id || undefined,
          minOrderAmount: v.minOrderAmount ? Number(v.minOrderAmount) : null,
          maxUses: v.maxUses ? Number(v.maxUses) : null,
        })
      }
      onDelete={(id) => deleteDiscountAction(id)}
    />
  );
}
