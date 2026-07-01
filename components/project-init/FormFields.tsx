'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useFormContext, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useProjectFormI18nSafe } from './ProjectFormI18n'

interface BaseFieldProps<T extends FieldValues> {
  name: FieldPath<T>
  label: string
  required?: boolean
  description?: string
  className?: string
}

function FieldWrapper({
  label,
  required,
  description,
  error,
  className,
  children,
  ...rest
}: {
  label: string
  required?: boolean
  description?: string
  error?: string
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
  const { translateValidation, locale } = useProjectFormI18nSafe()
  return (
    <div className={cn('space-y-2', className)} {...rest}>
      <Label>
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
      {error ? <p className="text-xs text-destructive">{translateValidation(error) ?? error}</p> : null}
    </div>
  )
}

export function TextField<T extends FieldValues>({
  name,
  label,
  required,
  description,
  type = 'text',
  placeholder,
  className,
}: BaseFieldProps<T> & { type?: string; placeholder?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} required={required} description={description} error={error} className={className}>
      <Input id={String(name)} data-field={String(name)} type={type} placeholder={placeholder} {...register(name)} />
    </FieldWrapper>
  )
}

export function NumberField<T extends FieldValues>({
  name,
  label,
  required,
  description,
  placeholder,
  className,
}: BaseFieldProps<T> & { placeholder?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} required={required} description={description} error={error} className={className}>
      <Input type="number" placeholder={placeholder} {...register(name, { valueAsNumber: true })} />
    </FieldWrapper>
  )
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  required,
  description,
  rows = 3,
  className,
}: BaseFieldProps<T> & { rows?: number }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} required={required} description={description} error={error} className={className}>
      <Textarea rows={rows} {...register(name)} />
    </FieldWrapper>
  )
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  required,
  description,
  options,
  placeholder = 'Select...',
  className,
  onValueChange,
}: BaseFieldProps<T> & {
  options: readonly { value: string; label: string }[]
  placeholder?: string
  onValueChange?: (value: string) => void
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>()
  const { translateValidation, locale } = useProjectFormI18nSafe()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} required={required} description={description} error={error} className={className} data-field={String(name)}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            key={`${String(name)}-${locale}`}
            value={field.value ?? ''}
            onValueChange={(value) => {
              field.onChange(value)
              onValueChange?.(value)
            }}
          >
            <SelectTrigger id={String(name)} data-field={String(name)}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldWrapper>
  )
}

/** Grouped dropdown for long standard lists (US, CA, DE, EU, IR, International) */
export function GroupedSelectField<T extends FieldValues>({
  name,
  label,
  required,
  description,
  groups,
  placeholder = 'Select...',
  className,
}: BaseFieldProps<T> & {
  groups: readonly { group: string; options: readonly { value: string; label: string }[] }[]
  placeholder?: string
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>()
  const { translateValidation, locale } = useProjectFormI18nSafe()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} required={required} description={description} error={error} className={className}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select key={`${String(name)}-${locale}`} value={field.value ?? ''} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {groups.map((g) => (
                <SelectGroup key={g.group}>
                  <SelectLabel>{g.group}</SelectLabel>
                  {g.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldWrapper>
  )
}

export function MultiSelectField<T extends FieldValues>({
  name,
  label,
  required,
  description,
  options,
  className,
}: BaseFieldProps<T> & {
  options: readonly { value: string; label: string }[]
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} required={required} description={description} error={error} className={className}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const selected: string[] = Array.isArray(field.value) ? field.value : []
          return (
            <div className="grid gap-2 sm:grid-cols-2 rounded-lg border p-3 bg-muted/10">
              {options.map((opt) => {
                const checked = selected.includes(opt.value)
                return (
                  <label key={opt.value} className="flex items-start gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, opt.value]
                          : selected.filter((v) => v !== opt.value)
                        field.onChange(next)
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                )
              })}
            </div>
          )
        }}
      />
    </FieldWrapper>
  )
}

export function SwitchField<T extends FieldValues>({
  name,
  label,
  description,
  className,
}: BaseFieldProps<T>) {
  const { control } = useFormContext<T>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={cn('flex items-start gap-3 rounded-lg border p-3', className)}>
          <Checkbox
            id={String(name)}
            checked={Boolean(field.value)}
            onChange={(e) => field.onChange(e.target.checked)}
          />
          <div>
            <Label htmlFor={String(name)} className="cursor-pointer">
              {label}
            </Label>
            {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
          </div>
        </div>
      )}
    />
  )
}

export function FileDropzone<T extends FieldValues>({
  name,
  label,
  description,
  accept,
  onFileSelected,
}: BaseFieldProps<T> & {
  accept?: string
  onFileSelected?: (fileName: string) => void
}) {
  const { setValue, watch } = useFormContext<T>()
  const fileName = watch(name) as string | undefined

  return (
    <FieldWrapper label={label} description={description}>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
        <div className="flex flex-col items-center justify-center py-4 px-4 text-center">
          <p className="text-sm font-medium">Click or drag file to upload</p>
          <p className="text-xs text-muted-foreground mt-1">{fileName || 'No file selected'}</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setValue(name, file.name as never, { shouldDirty: true })
              onFileSelected?.(file.name)
            }
          }}
        />
      </label>
    </FieldWrapper>
  )
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b pb-4 mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
    </div>
  )
}

export function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const gridClass =
    cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
  return <div className={cn('grid gap-4', gridClass)}>{children}</div>
}

export function SubsectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground col-span-full mt-2">
      {children}
    </h3>
  )
}
