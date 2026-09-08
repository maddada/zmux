import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconFolderOpen } from '@tabler/icons-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/packages/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/packages/components/ui/popover';
import { Input } from '@/packages/components/ui/input';
import { SettingsSelect, SettingsSelectContent } from './settings-modal/fields';
import { StashedPromptEditorTagSelect } from './stashed-prompts-editor-tag-select';

const projects = [
  'Ghostex',
  'Release Tools',
  'Docs',
  'Website',
  'Mobile',
  'Server',
  'Design System',
  'Extensions',
  'Archive',
];

function SearchableSelectStory() {
  const [project, setProject] = useState('Ghostex');
  const [tag, setTag] = useState<string | undefined>();
  const [favorite, setFavorite] = useState(false);
  return (
    <div
      className='ghostex-root ghostex-settings-shadcn flex h-screen flex-col gap-6 bg-background p-10 text-foreground'
      data-sidebar-theme='dark-2'
    >
      <label className='flex flex-col gap-2'>
        Projects
        <SettingsSelect value={project} onValueChange={setProject} searchPlaceholder='Search projects...'>
          <SelectTrigger aria-label='Project'>
            <SelectValue />
          </SelectTrigger>
          <SettingsSelectContent
            header={
              <Popover>
                <PopoverTrigger>New project...</PopoverTrigger>
                <PopoverContent>
                  <Input aria-label='Project name' placeholder='Project name' />
                </PopoverContent>
              </Popover>
            }
          >
            <SelectGroup>
              <SelectLabel>Workspace</SelectLabel>
              {projects.map((name) => (
                <SelectItem key={name} value={name} disabled={name === 'Archive'}>
                  <IconFolderOpen size={16} />
                  {name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SettingsSelectContent>
        </SettingsSelect>
      </label>
      <label className='flex flex-col gap-2'>
        Small list
        <Select defaultValue='system'>
          <SelectTrigger aria-label='Appearance'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='system'>System</SelectItem>
            <SelectItem value='dark'>Dark</SelectItem>
            <SelectItem value='light'>Light</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <form className='flex flex-col gap-2'>
        Branch
        <Select searchable name='branch' defaultValue='main' searchPlaceholder='Filter branches...'>
          <SelectTrigger aria-label='Branch'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='main'>main</SelectItem>
            <SelectItem value='feature/ui'>feature/ui</SelectItem>
          </SelectContent>
        </Select>
      </form>
      <StashedPromptEditorTagSelect
        isFavorite={favorite}
        onFavoriteChange={setFavorite}
        selectedTagId={tag}
        onTagChange={setTag}
        tags={projects.map((name, i) => ({ tagId: `tag-${i}`, name, color: '#8ba7e8', isBuiltin: false }))}
      />
    </div>
  );
}
const meta = {
  title: 'Components/Searchable Select',
  component: SearchableSelectStory,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SearchableSelectStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
