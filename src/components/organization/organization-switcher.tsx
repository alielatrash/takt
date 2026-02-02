'use client'

import { Check, ChevronsUpDown, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useOrganizations, useSwitchOrganization } from '@/hooks/use-organization'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function OrganizationSwitcher() {
  const [open, setOpen] = useState(false)
  const { data: organizations, isLoading } = useOrganizations()
  const switchOrg = useSwitchOrganization()

  const currentOrg = organizations?.find((org) => org.isCurrent)

  if (isLoading || !organizations || organizations.length <= 1) {
    return null // Don't show switcher if user only belongs to one org
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <Building2 className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{currentOrg?.name}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => {
                    if (org.id !== currentOrg?.id) {
                      switchOrg.mutate(org.id)
                    }
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      org.isCurrent ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{org.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {org.role === 'OWNER' ? 'Owner' : org.role === 'ADMIN' ? 'Admin' : 'Member'} • {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
