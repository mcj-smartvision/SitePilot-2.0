'use client'

import { useFormContext, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
}: {
  label: string
  required?: boolean
  description?: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
      <Input type={type} placeholder={placeholder} {...register(name)} />
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
}: BaseFieldProps<T> & {
  options: readonly { value: string; label: string }[]
  placeholder?: string
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
        render={({ field }) => (
          <Select value={field.value ?? ''} onValueChange={field.onChange}>
            <SelectTrigger>
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

export function FieldGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const gridClass =
    cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
  return <div className={cn('grid gap-4', gridClass)}>{children}</div>
}

export function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground col-span-full mt-2">
      {children}
    </h3>
  )
}
