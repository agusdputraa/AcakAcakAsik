// Every destination gets the same usable area and spacing, including incomplete rows.
export function fieldLayout(count, participants = 0) {
    count = Math.max(1, Math.min(30, Math.floor(count) || 1));
    const columns = Math.ceil(Math.sqrt(Math.max(8,count)));
    const rows = Math.ceil(Math.max(8,count) / columns);
    const size = Math.max(8, Math.min(12, 8 + Math.floor(Math.sqrt(participants) / 5)));
    const gap = 3;
    const width = columns * (size + gap) + 6;
    const depth = rows * (size + gap) + 6;
    const centers = Array.from({ length: count }, (_, index) => {
        const row = Math.floor(index / columns);
        const rowCount = Math.min(columns, count - row * columns);
        return [(index % columns - (rowCount - 1) / 2) * (size + gap), (row - (rows - 1) / 2) * (size + gap) - depth / 2];
    });
    return { width, depth, size, centers, centerZ: -depth / 2, waitingZ: 12 };
}
