export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    {
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      description: 'Main headline on the homepage',
    },
    {
      name: 'heroSubtitle',
      title: 'Hero Subtitle',
      type: 'string',
    },
    {
      name: 'aboutSnippet',
      title: 'About Snippet',
      type: 'text',
      rows: 3,
      description: 'Short about text shown on homepage',
    },
    {
      name: 'email',
      title: 'Contact Email',
      type: 'string',
      initialValue: 'hello@bermoco.com',
    },
    {
      name: 'phone',
      title: 'Phone',
      type: 'string',
    },
    {
      name: 'bookingLink',
      title: 'Booking Link',
      type: 'url',
      description: 'Calendly or booking URL',
    },
    {
      name: 'instagram',
      title: 'Instagram Handle',
      type: 'string',
      initialValue: '@bermo.co',
    },
    {
      name: 'tiktok',
      title: 'TikTok Handle',
      type: 'string',
      initialValue: '@bermo.co',
    },
    {
      name: 'linkedin',
      title: 'LinkedIn URL',
      type: 'url',
    },
  ],
}
