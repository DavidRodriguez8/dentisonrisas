import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Modal, Button, Form } from 'react-bootstrap';
import { supabase } from '../supabaseClient'; // Asegúrate de importar correctamente supabase.

const CitasComponent = () => {
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventStatus, setEventStatus] = useState('');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    id: '',
    patient: '',
    contact: '',
    start: '',
    end: '',
    title: '',
    description: '',
    status:''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (formData.start) {
      const startDate = new Date(formData.start);
      const horaLocal = new Date(startDate.getTime() - (5 * 60 * 60 * 1000));
      const endDate = new Date(horaLocal.getTime() + 30 * 60000);
      setFormData(prevData => ({
        ...prevData,
        end: endDate.toISOString().slice(0, 16) // Formato para datetime-local
      }));
    }
  }, [formData.start]);

  useEffect(() => {
    //console.log('Selected event:', selectedEvent);
    if (!selectedEvent || !formData.id) return;
    
    const updateEventStatus = async (newStatus) => {
      const { error } = await supabase
        .from('cita')
        .update({ status: newStatus })
        .eq('id', formData.id);
  
      if (error) {
        console.error('Error actualizando el estado:', error);
      } else {
        fetchEvents();
      }
    };

    if (selectedEvent) {
      const localTime = new Date();

      const startDate = new Date(selectedEvent.start);
      const endDate = new Date(selectedEvent.end);

      // Verificar si la fecha y hora actual está entre el rango de la cita
      if (localTime >= startDate && localTime <= endDate) {
        setEventStatus('badge text-bg-info');
        if (formData.status !== 'En Proceso') {
          setFormData((prev) => {
            const newFormData = { ...prev, status: 'En Proceso' };
            //console.log('Nuevo formData:', newFormData);
            return newFormData;
          });
          updateEventStatus('En Proceso'); // Actualizar estado a "En Proceso"
        }
      } else if (localTime > endDate) {
        setEventStatus('badge text-bg-success');
        if (formData.status !== 'Finalizado') {
          setFormData((prev) => {
            const newFormData = { ...prev, status: 'Finalizado' };
            //console.log('Nuevo formData:', newFormData);
            return newFormData;
          });
          updateEventStatus('Finalizado');
        }
      } else {
        setEventStatus('badge text-bg-warning');
      }
    }
  }, [selectedEvent, formData]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
        .from("cita")
        .select("*");

    if (error) {
        console.error("Error fetching citas:", error);
    } else {
      const calendarEvents = data.map(cita => ({
        title: cita.title,
        start: cita.fstart,
        end: cita.fend,
        extendedProps: {
          id: cita.id,
          patient: cita.patient, // Asegúrate de que 'patient' está en la tabla 'cita'
          contact: cita.contact, // Asegúrate de que 'contact' está en la tabla 'cita'
          description: cita.description, // También puedes incluir otros campos adicionales
          status: cita.status
        }
      }));
      setEvents(calendarEvents);
    }
  };

  const handleEventClick = (info) => {
    setSelectedEvent(info.event);
    setFormData({
      id: info.event.extendedProps.id,
      patient: info.event.extendedProps.patient,
      contact: info.event.extendedProps.contact,
      start: formatDateForInput(info.event.start),
      end: formatDateForInput(info.event.end),
      title: info.event.title,
      description: info.event.extendedProps.description || '',
      status: info.event.extendedProps.status
    });
    setShowDetailsModal(true);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
  
    // Asegúrate de que formData tenga todos los campos necesarios
    const { patient, contact, start, end, title, description } = formData;

    // Validar si las citas se solapan
    const { data: existingEvents, error: checkError } = await supabase
        .from('cita')
        .select('*')
        .or(`fstart.lt.${end},fend.gt.${start}`);

    if (checkError) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al verificar citas existentes. Por favor, intenta nuevamente.',
        });
        return;
    }

    // Validar si hay citas que se solapan
    if (existingEvents.length > 0) {
      const hasConflict = existingEvents.some(event => {
        const eventStart = new Date(event.fstart);
        const eventEnd = new Date(event.fend);
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Verificamos solapamiento excluyendo casos consecutivos
        return (
          !(startDate >= eventEnd || endDate <= eventStart) // Modificamos para permitir consecutividad
        );
      });

      if (hasConflict) {
        Swal.fire({
          icon: 'error',
          title: '¡Verifica la hora!',
          text: 'Las citas necesitan 30 minutos para su realización o verifica si ya existe una cita en ese horario.',
        });
        return;
      }
    }

    // Convierte las fechas a objetos Date
    const startDate = new Date(start);
    
    // Extrae horas y minutos
    const editHourStart = startDate.getHours();
    const editMinuteStart = startDate.getMinutes();

    // Valida el horario
    const isValidTime =
      ((editHourStart > 8 || (editHourStart === 8 && editMinuteStart >= 0)) && // Desde las 8:00 AM
      (editHourStart < 12 || (editHourStart === 11 && editMinuteStart === 30)) // Hasta las 11:30 AM
      ) || (
      (editHourStart > 14 || (editHourStart === 14 && editMinuteStart >= 30)) && // Desde las 2:30 PM
      (editHourStart < 17 || (editHourStart === 16 && editMinuteStart === 30))); // Hasta las 4:30 PM

    if (!isValidTime) {
      // Muestra un mensaje de error si no es válido
      Swal.fire({
        title: '¡Hora de atención inválida!',
        text: 'Por favor seleccione una hora en el horario de atención de 8:00 a.m. a 12:00 p.m. o de 2:30 p.m. a 5:00 p.m. ¡Tenga en cuenta que la cita debe contar con 30 minutos antes de cerrar!',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return; // Detiene la ejecución si la hora no es válida
    }

    const { error } = await supabase
      .from('cita') // Nombre de la tabla
      .insert([
        {
          patient,
          contact,
          fstart: start, // Cambia según el nombre de la columna en tu base de datos
          fend: end, // Cambia según el nombre de la columna en tu base de datos
          title,
          description,
          status: 'Pendiente'
        }
      ]);
  
    if (error) {
      console.error('Error al crear la cita:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo crear la cita. Por favor, intenta nuevamente.',
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Cita creada',
        text: 'La cita se ha creado con éxito.',
        showConfirmButton: false,
        allowOutsideClick: false,
        timer: 2000,
      });
      fetchEvents(); // Actualiza la lista de eventos después de crear la cita
      setShowCreateModal(false); // Cierra el modal de creación
    }
  };

  const handleEditAppointment = async (e) => {
    e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
  
    // Asegúrate de que formData tenga todos los campos necesarios
    const { patient, contact, start, end, title, description } = formData;

    //console.log('formData:', formData);

    // Validar si las citas se solapan
    const { data: existingEvents, error: checkError } = await supabase
      .from('cita')
      .select('*')
      .or(`fstart.lt.${end},fend.gt.${start}`)
      .neq('id', formData.id);

    if (checkError) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al verificar citas existentes. Por favor, intenta nuevamente.',
        });
        return;
    }

    // Validar si hay citas que se solapan
    if (existingEvents.length > 0) {
      const hasConflict = existingEvents.some(event => {
        const eventStart = new Date(event.fstart);
        const eventEnd = new Date(event.fend);
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Verificamos solapamiento excluyendo casos consecutivos
        return (
          !(startDate >= eventEnd || endDate <= eventStart) // Modificamos para permitir consecutividad
        );
      });

      if (hasConflict) {
        Swal.fire({
          icon: 'error',
          title: '¡Verifica la hora!',
          text: 'Las citas necesitan 30 minutos para su realización o verifica si ya existe una cita en ese horario.',
        });
        return;
      }
    }

    // Convierte las fechas a objetos Date
    const startDate = new Date(start);
    
    // Extrae horas y minutos
    const editHourStart = startDate.getHours();
    const editMinuteStart = startDate.getMinutes();

    // Valida el horario
    const isValidTime =
      ((editHourStart > 8 || (editHourStart === 8 && editMinuteStart >= 0)) && // Desde las 8:00 AM
      (editHourStart < 12 || (editHourStart === 11 && editMinuteStart === 30)) // Hasta las 11:30 AM
      ) || (
      (editHourStart > 14 || (editHourStart === 14 && editMinuteStart >= 30)) && // Desde las 2:30 PM
      (editHourStart < 17 || (editHourStart === 16 && editMinuteStart === 30))); // Hasta las 4:30 PM

    if (!isValidTime) {
      // Muestra un mensaje de error si no es válido
      Swal.fire({
        title: '¡Hora de atención inválida!',
        text: 'Por favor seleccione una hora en el horario de atención de 8:00 a.m. a 12:00 p.m. o de 2:30 p.m. a 5:00 p.m. ¡Tenga en cuenta que la cita debe contar con 30 minutos antes de cerrar!',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return; // Detiene la ejecución si la hora no es válida
    }

    const { error } = await supabase
      .from('cita') // Nombre de la tabla
      .update({
        patient,
        contact,
        fstart: start,
        fend: end,
        title,
        description,
        status: 'Pendiente'
      })
      .eq('id', formData.id);
  
    if (error) {
      console.error('Error al editar la cita:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo editar la cita. Por favor, intenta nuevamente.',
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: '¡Actualizado!',
        text: 'Cita actualizada correctamente.',
        showConfirmButton: false,
        allowOutsideClick: false,
        timer: 2000,
      });

      setSelectedEvent((prevEvent) => ({
        ...prevEvent,
        title,
        start: new Date(start),
        end: new Date(end),
        extendedProps: {
          ...prevEvent.extendedProps,
          patient,
          contact,
          description,
          status: 'Pendiente'
        }
      }));

      fetchEvents(); // Actualiza la lista de eventos después de crear la cita
      setShowEditModal(false); // Cierra el modal de editar
    }
  };

  const handleDeleteAppointment = async (e) => {
    e.preventDefault();
  
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará permanentemente la cita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });
  
    if (result.isConfirmed) {
      const { error } = await supabase
        .from('cita') // Nombre de la tabla
        .delete({})
        .eq('id', formData.id);
  
      if (error) {
        console.error('Error al eliminar la cita:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar la cita. Por favor, intenta nuevamente.',
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: '¡Eliminado!',
          text: 'Cita eliminada correctamente.',
          showConfirmButton: false,
          allowOutsideClick: false,
          timer: 2000,
        });
        fetchEvents(); // Actualiza la lista de eventos después de eliminar la cita
        setShowDetailsModal(false); // Cierra el modal de detalles
      }
    }
  }; 
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatDateForInput = (date) => {
    const d = new Date(date);
    const pad = (num) => num.toString().padStart(2, '0');
  
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1); // Meses en JavaScript son de 0 a 11
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
  
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTimeTo12Hour = (dateString) => {
    const date = new Date(dateString);
    const pad = (num) => num.toString().padStart(2, '0');
  
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // Meses en JavaScript son de 0 a 11
    const day = pad(date.getDate());
    const hours = date.getHours();
    const minutes = pad(date.getMinutes());
  
    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
    const formattedHours = pad(hours % 12 || 12); // Convierte a formato 12 horas
    const formattedTime = `${formattedHours}:${minutes} ${ampm}`;
  
    return `${day}/${month}/${year} ${formattedTime}`;
  };
  

  const handleOpenCreateModal = () => {
    setFormData({
      patient: '',
      contact: '',
      start: '',
      title: '',
      description: '',
      end: ''
    });
    setShowCreateModal(true);
  };

  const getLocalDateTime = () => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    return localDateTime.toISOString().slice(0, 16); // Formato para datetime-local
  }

  /*const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };*/

  return (
    <div className="container">
      <br />
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="flex-grow-1 text-center">
            <h3>CALENDARIO DE CITAS</h3>
          </div>
          <Button variant="warning" onClick={handleLogout}>
            <span><i className="fas fa-sign-out-alt"></i> Cerrar Sesión</span>
          </Button>
          <div></div>
        </div>
        <div className="card-body">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale="es"
            buttonText={{ today: 'Hoy', agendar: 'Agendar' }}
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'today agendar'
            }}
            allDayText="Todo el día"
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }}
            slotMinTime="08:00:00"
            slotMaxTime="18:00:00"
            customButtons={{
              agendar: {
                text: 'Agendar',
                click: handleOpenCreateModal
              }
            }}
            events={events}
            eventClick={handleEventClick}
            contentHeight="auto"
          />
        </div>
      </div>

      {/* Modal para crear citas */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Crear cita</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateAppointment}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Paciente:</Form.Label>
              <Form.Control
                type="text"
                value={formData.patient}
                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Contacto:</Form.Label>
              <Form.Control
                type="number"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Fecha y Hora:</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formData.start}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                min={getLocalDateTime()} // Establece el valor mínimo
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Tipo de consulta:</Form.Label>
              <Form.Control
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Descripción:</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Fecha finalización estimada:</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formData.end}
                readOnly
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" variant="success">Guardar</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cerrar</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal para detalles de la cita */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Detalles de la Cita</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        {selectedEvent && (() => {
          const startFormatted = formatDateTimeTo12Hour(selectedEvent.start.toISOString());
          const endFormatted = formatDateTimeTo12Hour(selectedEvent.end.toISOString());

          return (
            <>
              <h5 style={{ textAlign: 'center' }}>{selectedEvent.title}</h5>
              <hr className="custom-hr" />
              <p><strong>Paciente:</strong> {selectedEvent.extendedProps.patient}</p>
              <p><strong>Contacto:</strong> {selectedEvent.extendedProps.contact}</p>
              <p><strong>Descripción:</strong> {selectedEvent.extendedProps.description || 'Sin descripción'}</p>
              <p><strong>Fecha y Hora de la cita:</strong> {startFormatted}</p>
              <p><strong>Fecha y Hora de finalización estimada:</strong> {endFormatted}</p>
              <p>
                <strong>Estado: </strong>
                <span className={eventStatus}>
                  {formData.status}
                </span>
              </p>
            </>
          );
        })()}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="primary"
            onClick={() => setShowEditModal(true)}
            disabled={formData.status !== 'Pendiente'}
          >Editar</Button>
          <Button variant="danger" onClick={handleDeleteAppointment}>Eliminar</Button>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para editar citas */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Cita</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditAppointment}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Paciente:</Form.Label>
              <Form.Control
                type="text"
                value={formData.patient}
                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Contacto:</Form.Label>
              <Form.Control
                type="number"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Fecha y Hora:</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formData.start}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Tipo de consulta:</Form.Label>
              <Form.Control
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Descripción:</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Fecha finalización estimada:</Form.Label>
              <Form.Control
                type="datetime-local"
                value={selectedEvent ? formatDateForInput(selectedEvent.end) : ''}
                readOnly
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" variant="success">Actualizar</Button>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cerrar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CitasComponent;