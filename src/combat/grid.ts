/**
 * Uniform bucket grid over the arena, rebuilt every tick by counting sort into
 * buffers it owns, so a tick allocates nothing. Cells hold unit indices, not
 * objects.
 *
 * A query radius no larger than `cellSize` is covered by the 3x3 block around a
 * unit's own cell, so callers walk `cellStart`/`order` directly rather than
 * asking for a result array.
 */
export class BucketGrid {
	cols = 1;
	rows = 1;
	cellSize = 1;
	/** Start of each cell's run in `order`; length `cols * rows + 1`. */
	cellStart = new Int32Array(1);
	/** Unit indices grouped by cell. */
	order = new Int32Array(0);
	/** Each unit's cell, indexed by unit. */
	cellOf = new Int32Array(0);
	private cursor = new Int32Array(1);

	build(
		x: Float32Array,
		y: Float32Array,
		n: number,
		cellSize: number,
		width: number,
		height: number,
	): void {
		// One cell of margin per axis, so a unit sitting on the far edge still indexes
		// in range.
		const cols = Math.max(1, Math.ceil(width / cellSize) + 1);
		const rows = Math.max(1, Math.ceil(height / cellSize) + 1);
		const nCells = cols * rows;
		this.cols = cols;
		this.rows = rows;
		this.cellSize = cellSize;

		if (this.cellStart.length < nCells + 1) {
			this.cellStart = new Int32Array(nCells + 1);
			this.cursor = new Int32Array(nCells + 1);
		} else {
			this.cellStart.fill(0, 0, nCells + 1);
		}
		if (this.order.length < n) {
			this.order = new Int32Array(n);
			this.cellOf = new Int32Array(n);
		}

		const cellStart = this.cellStart;
		const cellOf = this.cellOf;
		const inv = 1 / cellSize;

		// Counted one slot high, so the prefix sum below lands directly in place.
		for (let i = 0; i < n; i++) {
			let cx = (x[i] * inv) | 0;
			let cy = (y[i] * inv) | 0;
			if (cx < 0) cx = 0;
			else if (cx >= cols) cx = cols - 1;
			if (cy < 0) cy = 0;
			else if (cy >= rows) cy = rows - 1;
			const ci = cy * cols + cx;
			cellOf[i] = ci;
			cellStart[ci + 1]++;
		}
		for (let c = 0; c < nCells; c++) cellStart[c + 1] += cellStart[c];

		this.cursor.set(cellStart.subarray(0, nCells));
		const cursor = this.cursor;
		const order = this.order;
		for (let i = 0; i < n; i++) order[cursor[cellOf[i]]++] = i;
	}
}
