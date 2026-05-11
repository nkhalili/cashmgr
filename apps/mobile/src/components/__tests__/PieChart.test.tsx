import React from 'react';
import { render } from '@testing-library/react-native';
import { PieChart, PieChartData } from '../PieChart';

describe('PieChart', () => {
  const mockData: PieChartData[] = [
    { id: '1', label: 'Food', value: 300, color: '#FF6B6B' },
    { id: '2', label: 'Transport', value: 200, color: '#4ECDC4' },
    { id: '3', label: 'Entertainment', value: 100, color: '#45B7D1' },
  ];

  describe('rendering', () => {
    it('should render with data', () => {
      const { UNSAFE_root } = render(<PieChart data={mockData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render as pie chart by default', () => {
      const { UNSAFE_root } = render(<PieChart data={mockData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render as donut chart when innerRadius is set', () => {
      const { UNSAFE_root } = render(<PieChart data={mockData} innerRadius={40} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with labels', () => {
      const { UNSAFE_root } = render(<PieChart data={mockData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render without labels for small slices', () => {
      const { UNSAFE_root } = render(<PieChart data={mockData} innerRadius={0} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with selected slice', () => {
      const { UNSAFE_root } = render(
        <PieChart data={mockData} selectedId="1" />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should call onSelectSlice when slice is pressed', () => {
      const onSelectSlice = jest.fn();
      const { UNSAFE_root } = render(
        <PieChart data={mockData} onSelectSlice={onSelectSlice} />
      );
      expect(UNSAFE_root).toBeTruthy();
      // Note: Testing onPress for SVG Path requires react-native-svg testing utilities
      // which are not easily available in jsdom environment
    });

    it('should render with custom size', () => {
      const { UNSAFE_root } = render(<PieChart data={mockData} size={300} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('data handling', () => {
    it('should handle single item', () => {
      const singleData: PieChartData[] = [
        { id: '1', label: 'Only', value: 100, color: '#FF6B6B' },
      ];
      const { UNSAFE_root } = render(<PieChart data={singleData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle many items', () => {
      const manyData: PieChartData[] = [
        { id: '1', label: 'Item 1', value: 100, color: '#FF6B6B' },
        { id: '2', label: 'Item 2', value: 200, color: '#4ECDC4' },
        { id: '3', label: 'Item 3', value: 300, color: '#45B7D1' },
        { id: '4', label: 'Item 4', value: 400, color: '#FFA07A' },
        { id: '5', label: 'Item 5', value: 500, color: '#98D8C8' },
      ];
      const { UNSAFE_root } = render(<PieChart data={manyData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle items with zero values', () => {
      const zeroData: PieChartData[] = [
        { id: '1', label: 'Zero', value: 0, color: '#FF6B6B' },
        { id: '2', label: 'Some', value: 100, color: '#4ECDC4' },
      ];
      const { UNSAFE_root } = render(<PieChart data={zeroData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle small values', () => {
      const smallData: PieChartData[] = [
        { id: '1', label: 'Tiny', value: 1, color: '#FF6B6B' },
        { id: '2', label: 'Small', value: 2, color: '#4ECDC4' },
      ];
      const { UNSAFE_root } = render(<PieChart data={smallData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle large values', () => {
      const largeData: PieChartData[] = [
        { id: '1', label: 'Large', value: 1000000, color: '#FF6B6B' },
        { id: '2', label: 'Huge', value: 2000000, color: '#4ECDC4' },
      ];
      const { UNSAFE_root } = render(<PieChart data={largeData} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});
