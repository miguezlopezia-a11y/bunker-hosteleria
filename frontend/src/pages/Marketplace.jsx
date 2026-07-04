import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';

const CATEGORY_OPTIONS = [
  { value: 'Restaurante', label: 'Restaurante' },
  { value: 'Lavandería', label: 'Lavandería' },
  { value: 'Farmacia', label: 'Farmacia' },
  { value: 'Taxi', label: 'Taxi' },
  { value: 'Tienda', label: 'Tienda' },
];

const EMPTY_FORM = { name: '', category: 'Restaurante', description: '', discount: '', phone: '' };

function ServiceFormModal({ isOpen, onClose, service }) {
  const { addMarketplaceService, updateMarketplaceService } = useApp();
  const { showToast } = useToast();
  const [form, setForm] = useState(service || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    setForm(service || EMPTY_FORM);
    setErrors({});
  }, [service, isOpen]);

  const isEditing = Boolean(service);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name) newErrors.name = 'Campo obligatorio';
    if (!form.description) newErrors.description = 'Campo obligatorio';
    if (!form.phone) newErrors.phone = 'Campo obligatorio';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (isEditing) {
      updateMarketplaceService(service.id, form);
      showToast('Servicio actualizado');
    } else {
      addMarketplaceService(form);
      showToast('Servicio añadido');
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Gestionar servicio' : 'Añadir servicio'} testId="service-form-modal" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="service-form">
        <Input label="Nombre" required value={form.name} onChange={handleChange('name')} error={errors.name} data-testid="service-name-input" />
        <Select label="Categoría" value={form.category} onChange={handleChange('category')} options={CATEGORY_OPTIONS} data-testid="service-category-select" />
        <Input label="Descripción" required value={form.description} onChange={handleChange('description')} error={errors.description} data-testid="service-description-input" />
        <Input label="Descuento para peregrinos" value={form.discount} onChange={handleChange('discount')} data-testid="service-discount-input" />
        <Input label="Teléfono de contacto" required type="tel" value={form.phone} onChange={handleChange('phone')} error={errors.phone} data-testid="service-phone-input" />
        <Button type="submit" fullWidth data-testid="service-form-submit-button">
          {isEditing ? 'Guardar cambios' : 'Añadir servicio'}
        </Button>
      </form>
    </Modal>
  );
}

export default function Marketplace() {
  const { marketplaceServices } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const openAddModal = () => {
    setEditingService(null);
    setModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setModalOpen(true);
  };

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto" data-testid="marketplace-page">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Servicios locales para peregrinos</h1>
          <Button onClick={openAddModal} data-testid="add-service-button">
            + Añadir servicio
          </Button>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Ofrece descuentos a tus huéspedes y genera ingresos por referencia.
        </p>

        {marketplaceServices.length === 0 ? (
          <p className="text-center text-slate-400 py-10" data-testid="marketplace-empty-state">
            No hay servicios registrados.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-6" data-testid="marketplace-services-list">
            {marketplaceServices.map((s) => (
              <Card key={s.id} className="flex items-center justify-between gap-3 flex-wrap" data-testid={`service-card-${s.id}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <Badge variant="default">{s.category}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{s.description}</p>
                  <p className="text-xs text-green-600 mt-1">{s.discount}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditModal(s)}
                  data-testid={`manage-service-link-${s.id}`}
                  className="text-blue-600 text-sm font-medium hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                >
                  Gestionar
                </button>
              </Card>
            ))}
          </div>
        )}

        <Card data-testid="marketplace-commissions-card">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Este mes: </span>
            3 referencias · € 12 en comisiones estimadas
          </p>
        </Card>

        <ServiceFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} service={editingService} />
      </div>
    </ManagerLayout>
  );
}
