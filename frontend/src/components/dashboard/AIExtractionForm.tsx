import { memo, useState } from 'react';
import { extractOperationFromText } from '@/api/operationsApi';
import { useCategories } from '@/hooks/useCategories';
import { useOperations } from '@/hooks/useOperations';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { Alert } from '@/components/common/Alert/Alert';
import { AccountSelectField } from './AccountSelectField';
import { OperationForm } from './OperationForm';
import { OPERATION_TYPES, CURRENCIES, OperationTypeMapper } from '@/utils/constants';
import { parseAmount } from '@/utils/formatters';
import type { ExtractedOperation, OperationTypeInput, Category } from '@/types/operation';
import type { Account } from '@/types/auth';

interface AIExtractionFormProps {
  accounts: Account[];
  selectedAccountId: number | null;
  onSelectAccount: (id: number) => void;
  onCreateOperation: () => void;
  onClose: () => void;
  show: boolean;
}

export const AIExtractionForm = memo(function AIExtractionForm({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onCreateOperation,
  onClose,
  show,
}: AIExtractionFormProps) {
  const { getCategoriesByType } = useCategories();
  const { addOperation } = useOperations();

  const [operationMode, setOperationMode] = useState<'manual' | 'ai'>('ai');
  const [narrationText, setNarrationText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedOperation, setExtractedOperation] = useState<ExtractedOperation | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [confirmingOperation, setConfirmingOperation] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [previewConcept, setPreviewConcept] = useState('');
  const [previewAmount, setPreviewAmount] = useState('');
  const [previewCurrency, setPreviewCurrency] = useState<string>(CURRENCIES[0]);
  const [previewType, setPreviewType] = useState<OperationTypeInput>('egreso');
  const [previewCategoryId, setPreviewCategoryId] = useState('');
  const [previewName, setPreviewName] = useState('');

  const previewFilteredCategories = getCategoriesByType(OperationTypeMapper.getCategoryType(OperationTypeMapper.fromInput(previewType)));

  const canConfirmOperation =
    !!selectedAccountId &&
    !!previewConcept.trim() &&
    parseAmount(previewAmount) > 0 &&
    !!previewCategoryId;

  const handleExtractOperation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId || !narrationText.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setAiSuccess(null);
    try {
      const extracted = await extractOperationFromText(narrationText.trim(), selectedAccountId);
      setExtractedOperation(extracted);
      setPreviewConcept(extracted.concept);
      setPreviewAmount(String(extracted.amount));
      setPreviewCurrency(extracted.currency ?? CURRENCIES[0]);
      setPreviewType(OperationTypeMapper.toInput(OperationTypeMapper.fromExtracted(extracted.type)));
      setPreviewCategoryId(String(extracted.category_id));
      setPreviewName(extracted.name ?? '');
      setConfirmError(null);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setExtractError(detail ?? 'No se pudieron extraer los datos de la operación');
    } finally {
      setExtracting(false);
    }
  };

  const handleResetNarration = () => {
    setExtractedOperation(null);
    setExtractError(null);
    setConfirmError(null);
    setAiSuccess(null);
    setNarrationText('');
  };

  const handleCreateOperationFromAi = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId || !extractedOperation) return;
    setConfirmingOperation(true);
    setConfirmError(null);
    try {
      await addOperation({
        concept: previewConcept.trim(),
        amount: parseAmount(previewAmount),
        type: previewType,
        account_id: selectedAccountId,
        category_id: Number(previewCategoryId),
        currency: previewCurrency,
        ...(previewName.trim() ? { name: previewName.trim() } : {}),
      });
      setExtractedOperation(null);
      setNarrationText('');
      setAiSuccess('Operación registrada correctamente');
      onCreateOperation();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setConfirmError(detail ?? 'No se pudo registrar la operación');
    } finally {
      setConfirmingOperation(false);
    }
  };

  if (!show) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva operación</h2>

      <div className="flex gap-2 mb-6">
        <Button
          type="button"
          variant={operationMode === 'ai' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setOperationMode('ai')}
          className="w-auto"
        >
          Mensaje con IA
        </Button>
        <Button
          type="button"
          variant={operationMode === 'manual' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setOperationMode('manual');
            setExtractError(null);
            setAiSuccess(null);
            setConfirmError(null);
          }}
          className="w-auto"
        >
          Formulario manual
        </Button>
      </div>

      {operationMode === 'ai' ? (
        <div className="space-y-4">
          {aiSuccess && <Alert message={aiSuccess} variant="success" />}
          {!extractedOperation ? (
            <form onSubmit={handleExtractOperation}>
              {extractError && <Alert message={extractError} />}
              <AccountSelectField
                id="ai-account"
                accounts={accounts}
                value={selectedAccountId}
                onChange={onSelectAccount}
              />
              <div className="space-y-4">
                <div>
                  <label htmlFor="ai-narration" className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje de la operación
                  </label>
                  <textarea
                    id="ai-narration"
                    value={narrationText}
                    onChange={(e) => setNarrationText(e.target.value)}
                    rows={3}
                    placeholder="Por ejemplo: gasté 9800 pesos en Carrefour"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Describí la operación con tus palabras; la IA extrae los datos.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={extracting || !selectedAccountId || !narrationText.trim()}
                  className="w-auto"
                >
                  {extracting ? 'Extrayendo datos…' : 'Extraer datos'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateOperationFromAi}>
              {confirmError && <Alert message={confirmError} />}
              <div className="space-y-4">
                <AccountSelectField
                  id="ai-preview-account"
                  accounts={accounts}
                  value={selectedAccountId}
                  onChange={onSelectAccount}
                />
                <Input
                  label="Concepto"
                  type="text"
                  value={previewConcept}
                  onChange={(e) => setPreviewConcept(e.target.value)}
                />
                <Input
                  label="Monto"
                  type="number"
                  value={previewAmount}
                  onChange={(e) => setPreviewAmount(e.target.value)}
                  step="0.01"
                />
                <div>
                  <label htmlFor="ai-preview-currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda
                  </label>
                  <select
                    id="ai-preview-currency"
                    value={previewCurrency}
                    onChange={(e) => setPreviewCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-preview-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="ai-preview-type"
                    value={previewType}
                    onChange={(e) => setPreviewType(e.target.value as OperationTypeInput)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {OPERATION_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-preview-category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  {previewFilteredCategories.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay categorías para este tipo de operación.</p>
                  ) : (
                    <select
                      id="ai-preview-category"
                      value={previewCategoryId}
                      onChange={(e) => setPreviewCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {previewFilteredCategories.map((category: Category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <Input
                  label="Nombre (opcional)"
                  type="text"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="Comercio, servicio o persona"
                />
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResetNarration}
                  className="w-auto"
                >
                  Nuevo relato
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={confirmingOperation || !canConfirmOperation}
                  className="w-auto"
                >
                  {confirmingOperation ? 'Registrando...' : 'Registrar operación'}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <OperationForm
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={onSelectAccount}
          onCreateOperation={onCreateOperation}
          onClose={onClose}
          show={true}
        />
      )}
    </div>
  );
});