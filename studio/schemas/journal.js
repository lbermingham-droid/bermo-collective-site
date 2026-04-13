export default {
  name: 'journal',
  title: 'Journal',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'publishDate',
      title: 'Publish Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: ['Journal', 'Interview', 'Case Study', 'Note'],
        layout: 'radio',
      },
      initialValue: 'Journal',
    },
    {
      name: 'subtitle',
      title: 'Subtitle / Hook',
      type: 'string',
    },
    {
      name: 'cover',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'video',
      title: 'Video URL',
      type: 'url',
      description: 'YouTube, Vimeo, or Loom link',
    },
    {
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    },
    {
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: false,
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'type',
      media: 'cover',
    },
  },
}
