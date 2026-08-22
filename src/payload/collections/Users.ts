import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrSelf, isAdminFieldLevel } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'roles', 'allowedServices'],
    group: 'Settings',
  },
  access: {
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
    admin: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text' },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['editor'],
      // Only an admin may grant or revoke a role — including their own.
      access: { create: isAdminFieldLevel, update: isAdminFieldLevel },
      options: [
        { label: 'Administrator', value: 'admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'Editor', value: 'editor' },
        { label: 'Support', value: 'support' },
      ],
    },
    {
      name: 'allowedServices',
      type: 'select',
      hasMany: true,
      access: { create: isAdminFieldLevel, update: isAdminFieldLevel },
      admin: {
        description:
          'Scopes a Manager to specific services. Ignored for other roles — admins reach everything, editors and support are governed by their role alone.',
        condition: (data) => Boolean(data?.roles?.includes('manager')),
      },
      options: [
        { label: 'Tours', value: 'tours' },
        { label: 'Hotels', value: 'hotels' },
        { label: 'Transfers', value: 'transfers' },
        { label: 'Bicycles', value: 'bicycles' },
      ],
    },
  ],
}
