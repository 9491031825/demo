import React from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

const ProcessingForm = ({ 
  processingData, 
  setProcessingData, 
  handleSubmit, 
  isSubmitting,
  inventoryItems,
  onCancel
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProcessingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Quality Type</Form.Label>
        <Form.Select
          name="quality_type"
          value={processingData.quality_type}
          onChange={handleChange}
          required
        >
          <option value="">Select Quality Type</option>
          {inventoryItems.map(item => (
            <option key={item.quality_type} value={item.quality_type}>
              {item.quality_type} ({item.quantity} kg available)
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Weight Loss (kg)</Form.Label>
        <Form.Control
          type="number"
          name="weight_loss"
          value={processingData.weight_loss}
          onChange={handleChange}
          placeholder="Enter weight loss in kg"
          min="0.01"
          step="0.01"
          required
        />
        <Form.Text className="text-muted">
          Amount of inventory to process
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Notes</Form.Label>
        <Form.Control
          as="textarea"
          name="notes"
          value={processingData.notes}
          onChange={handleChange}
          placeholder="Enter processing notes"
          rows={3}
        />
      </Form.Group>

      <Row className="mt-4">
        <Col>
          <Button 
            variant="secondary" 
            onClick={onCancel}
            className="w-100"
          >
            Cancel
          </Button>
        </Col>
        <Col>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isSubmitting}
            className="w-100"
          >
            {isSubmitting ? 'Processing...' : 'Process Inventory'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default ProcessingForm; 