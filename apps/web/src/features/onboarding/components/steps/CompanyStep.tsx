import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Combobox } from '@radikal/ui';
import { INDUSTRIES, WebsiteSource } from '@radikal/shared';
import { CompanySchema, type CompanyData } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';

const LocalCompanySchema = z.object({
  company_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  industry: z.string().trim().min(1, 'Selecciona una industria'),
  industry_custom: z.string().trim().optional().nullable(),
});

type LocalCompany = z.infer<typeof LocalCompanySchema>;

interface CompanyStepProps {
  defaultValues?: Partial<CompanyData>;
  onSubmit: (data: CompanyData) => Promise<void> | void;
  onBack: () => void;
  saving?: boolean;
}

export function CompanyStep({ defaultValues, onSubmit, onBack, saving }: CompanyStepProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<LocalCompany>({
    resolver: zodResolver(LocalCompanySchema),
    defaultValues: {
      company_name: defaultValues?.company_name ?? '',
      industry: defaultValues?.industry ?? '',
      industry_custom: defaultValues?.industry_custom ?? '',
    },
  });

  const industry = watch('industry');
  const isCustom = industry && !INDUSTRIES.includes(industry as (typeof INDUSTRIES)[number]);
  const isOtro = industry === 'Otro';

  const submit = handleSubmit(async (values) => {
    const full: CompanyData = CompanySchema.parse({
      company_name: values.company_name,
      industry: values.industry,
      industry_custom:
        isCustom || isOtro ? values.industry_custom || values.industry : null,
      website_source: defaultValues?.website_source ?? WebsiteSource.NONE,
      website_url: defaultValues?.website_url ?? null,
      website_manual_description: defaultValues?.website_manual_description ?? null,
      business_summary: defaultValues?.business_summary ?? null,
      ideal_customer: defaultValues?.ideal_customer ?? null,
      unique_value: defaultValues?.unique_value ?? null,
      main_products: defaultValues?.main_products ?? null,
      additional_context: defaultValues?.additional_context ?? null,
    });
    await onSubmit(full);
  });

  return (
    <form
      onSubmit={submit}
      className="animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col"
    >
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Sobre tu empresa</h2>
        <p className="mt-2 text-[hsl(var(--color-muted))]">
          Empecemos por lo básico. Puedes editar esto más adelante.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <Input
          label="Nombre de la empresa"
          placeholder="Ej. Radikal Studio"
          error={errors.company_name?.message}
          {...register('company_name')}
        />

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-tighter opacity-50">
            Industria
          </label>
          <Controller
            control={control}
            name="industry"
            render={({ field }) => (
              <Combobox
                options={INDUSTRIES.map((i) => ({ label: i, value: i }))}
                value={field.value}
                onChange={field.onChange}
                placeholder="Busca o escribe tu industria"
                searchPlaceholder="Busca o crea una..."
                emptyMessage="No encontramos esa industria"
                allowCustom
              />
            )}
          />
          {errors.industry && (
            <p className="text-xs text-red-500 font-medium">{errors.industry.message}</p>
          )}
        </div>

        {(isCustom || isOtro) && (
          <Input
            label="Describe tu industria"
            placeholder="Ej. Tecnología aplicada a educación rural"
            {...register('industry_custom')}
          />
        )}
      </div>

      <NavButtons
        onBack={onBack}
        nextType="submit"
        nextLabel="Continuar"
        loading={saving}
      />
    </form>
  );
}
