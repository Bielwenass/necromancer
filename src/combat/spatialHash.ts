type HasXY = { x: number; y: number };

export class SpatialHash<T extends HasXY> {
	private cells: Map<number, T[]> = new Map();
	private cellSize: number;

	constructor(cellSize: number) {
		this.cellSize = cellSize;
	}

	private cellKey(cx: number, cy: number): number {
		return ((cx + 32768) & 0xffff) | (((cy + 32768) & 0xffff) << 16);
	}

	clear(): void {
		this.cells.clear();
	}

	insert(item: T): void {
		const cx = Math.floor(item.x / this.cellSize);
		const cy = Math.floor(item.y / this.cellSize);
		const key = this.cellKey(cx, cy);
		let cell = this.cells.get(key);
		if (!cell) {
			cell = [];
			this.cells.set(key, cell);
		}
		cell.push(item);
	}

	queryRadius(x: number, y: number, radius: number): T[] {
		const results: T[] = [];
		const minCx = Math.floor((x - radius) / this.cellSize);
		const maxCx = Math.floor((x + radius) / this.cellSize);
		const minCy = Math.floor((y - radius) / this.cellSize);
		const maxCy = Math.floor((y + radius) / this.cellSize);
		const r2 = radius * radius;

		for (let cx = minCx; cx <= maxCx; cx++) {
			for (let cy = minCy; cy <= maxCy; cy++) {
				const key = this.cellKey(cx, cy);
				const cell = this.cells.get(key);
				if (!cell) continue;
				for (const item of cell) {
					const dx = item.x - x;
					const dy = item.y - y;
					if (dx * dx + dy * dy <= r2) {
						results.push(item);
					}
				}
			}
		}
		return results;
	}
}
