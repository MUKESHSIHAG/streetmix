export const TILESET_POINT_PER_PIXEL = 2.0
export const TILE_SIZE = 12 // pixels

export const MIN_SEGMENT_WIDTH = (1 / 0.3) * 0.25 // This is equal to 0.25m in our conversion rate
export const MAX_SEGMENT_WIDTH = 400

export const DRAGGING_MOVE_HOLE_WIDTH = 40 // pixels

export const SEGMENT_WARNING_OUTSIDE = 1
export const SEGMENT_WARNING_WIDTH_TOO_SMALL = 2
export const SEGMENT_WARNING_WIDTH_TOO_LARGE = 3

// Drag source / drop target types for react-dnd
export const DragTypes = {
  SEGMENT: 'SEGMENT',
  PALETTE_SEGMENT: 'PALETTE_SEGMENT',
  SEGMENT_RESIZE: 'SEGMENT_RESIZE'
}
