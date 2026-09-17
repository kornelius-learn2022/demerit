<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Csv as CsvReader;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CsvService
{
    /**
     * Stream an Excel (.xlsx) download with styling and auto-sized columns.
     *
     * @param array<string> $headers
     * @param iterable<array<mixed>> $rows
     * @param string $filename
     * @param string $sheetTitle
     * @return StreamedResponse
     */
    public function streamXlsx(array $headers, iterable $rows, string $filename, string $sheetTitle = 'Data'): StreamedResponse
    {
        if (!str_ends_with(strtolower($filename), '.xlsx')) {
            $filename .= '.xlsx';
        }

        return response()->streamDownload(function () use ($headers, $rows, $sheetTitle) {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle(substr(preg_replace('/[\\\\\\/?*\\[\\]:]/', '', $sheetTitle), 0, 31) ?: 'Data');

            // Header styling
            $headerStyle = [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 11,
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '3B82F6'], // Primary blue
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
            ];

            // Write headers (Row 1)
            $colIdx = 1;
            foreach ($headers as $header) {
                $sheet->setCellValue([$colIdx, 1], $header);
                $colIdx++;
            }

            $numCols = count($headers);
            $lastColLetter = Coordinate::stringFromColumnIndex($numCols);
            $sheet->getStyle("A1:{$lastColLetter}1")->applyFromArray($headerStyle);
            $sheet->getRowDimension(1)->setRowHeight(28);

            // Write data rows (Starting from Row 2)
            $rowNum = 2;
            foreach ($rows as $row) {
                $colIdx = 1;
                foreach ((array) $row as $val) {
                    $sheet->setCellValue([$colIdx, $rowNum], $val);
                    $colIdx++;
                }
                $rowNum++;
            }

            $lastDataRow = max(1, $rowNum - 1);
            if ($lastDataRow > 1) {
                $dataRange = "A2:{$lastColLetter}{$lastDataRow}";
                $sheet->getStyle($dataRange)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'E2E8F0'],
                        ],
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                // Zebra striping & row heights
                for ($r = 2; $r <= $lastDataRow; $r++) {
                    $sheet->getRowDimension($r)->setRowHeight(22);
                    if ($r % 2 === 1) {
                        $sheet->getStyle("A{$r}:{$lastColLetter}{$r}")->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->getStartColor()->setRGB('F8FAFC');
                    }
                }
            }

            // Auto-size all columns
            for ($i = 1; $i <= $numCols; $i++) {
                $colLetter = Coordinate::stringFromColumnIndex($i);
                $sheet->getColumnDimension($colLetter)->setAutoSize(true);
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }, $filename, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control'       => 'max-age=0, no-cache, no-store, must-revalidate',
            'Pragma'              => 'public',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Stream a CSV download with UTF-8 BOM for Excel compatibility.
     *
     * @param array<string> $headers
     * @param iterable<array<mixed>> $rows
     * @param string $filename
     * @return StreamedResponse
     */
    public function streamCsv(array $headers, iterable $rows, string $filename): StreamedResponse
    {
        if (!str_ends_with(strtolower($filename), '.csv')) {
            $filename .= '.csv';
        }

        return response()->streamDownload(function () use ($headers, $rows) {
            $handle = fopen('php://output', 'w');

            // Write UTF-8 BOM for Excel
            fputs($handle, "\xEF\xBB\xBF");

            // Write header
            fputcsv($handle, $headers);

            // Write data rows
            foreach ($rows as $row) {
                fputcsv($handle, (array) $row);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Cache-Control'       => 'no-store, no-cache',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Stream a template Excel download with sample rows.
     */
    public function streamTemplate(array $headers, array $samples, string $filename): StreamedResponse
    {
        if (str_ends_with(strtolower($filename), '.xlsx')) {
            return $this->streamXlsx($headers, $samples, $filename, 'Template');
        }
        return $this->streamCsv($headers, $samples, $filename);
    }

    /**
     * Parse an uploaded file (XLSX, XLS, CSV) into structured rows with headers.
     *
     * @param UploadedFile $file
     * @return array{headers: array<string>, rows: array<array{line: int, data: array<string, string>}>}
     */
    public function parseCsv(UploadedFile $file): array
    {
        return $this->parseSpreadsheet($file);
    }

    /**
     * Parse an uploaded spreadsheet (Excel .xlsx, .xls, or .csv) into structured rows.
     *
     * @param UploadedFile $file
     * @return array{headers: array<string>, rows: array<array{line: int, data: array<string, string>}>}
     */
    public function parseSpreadsheet(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if (! $path || ! file_exists($path)) {
            throw new \InvalidArgumentException('Uploaded file cannot be read.');
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));

        // If file is Excel (.xlsx or .xls)
        if (in_array($extension, ['xlsx', 'xls', 'ods', 'xlsm'], true)) {
            return $this->parseExcelFile($path);
        }

        // Otherwise parse as CSV / TXT (with auto-detect delimiter)
        return $this->parseCsvFile($path);
    }

    /**
     * Parse Excel file using PhpSpreadsheet.
     */
    protected function parseExcelFile(string $path): array
    {
        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);
            $sheet = $spreadsheet->getActiveSheet();
        } catch (\Exception $e) {
            throw new \InvalidArgumentException('Gagal membaca file Excel: ' . $e->getMessage());
        }

        $sheetData = $sheet->toArray(null, true, true, true);
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        if (empty($sheetData)) {
            throw new \InvalidArgumentException('File Excel kosong.');
        }

        // Find header row (first non-empty row)
        $headerRow = null;
        $headerLineNum = 1;
        foreach ($sheetData as $rowIdx => $row) {
            $nonEmpty = array_filter($row, fn($v) => $v !== null && trim((string) $v) !== '');
            if (!empty($nonEmpty)) {
                $headerRow = $row;
                $headerLineNum = (int) $rowIdx;
                break;
            }
        }

        if (! $headerRow) {
            throw new \InvalidArgumentException('File Excel tidak memiliki baris header.');
        }

        // Clean headers and map column letters
        $colToHeader = [];
        $headers = [];
        foreach ($headerRow as $colLetter => $val) {
            $cleanH = trim((string) $val);
            if ($cleanH !== '') {
                $colToHeader[$colLetter] = $cleanH;
                $headers[] = $cleanH;
            }
        }

        if (empty($headers)) {
            throw new \InvalidArgumentException('Header kolom tidak ditemukan pada file Excel.');
        }

        $rows = [];
        foreach ($sheetData as $rowIdx => $row) {
            if ($rowIdx <= $headerLineNum) {
                continue; // Skip header and any pre-header rows
            }

            // Check if row has any data in defined header columns
            $hasData = false;
            $rowData = [];
            foreach ($colToHeader as $colLetter => $hName) {
                $cellVal = isset($row[$colLetter]) ? trim((string) $row[$colLetter]) : '';
                $rowData[$hName] = $cellVal;
                if ($cellVal !== '') {
                    $hasData = true;
                }
            }

            if ($hasData) {
                $rows[] = [
                    'line' => (int) $rowIdx,
                    'data' => $rowData,
                ];
            }
        }

        return [
            'headers' => $headers,
            'rows'    => $rows,
        ];
    }

    /**
     * Parse CSV file with automatic delimiter detection and BOM handling.
     */
    protected function parseCsvFile(string $path): array
    {
        $handle = fopen($path, 'r');
        if (! $handle) {
            throw new \InvalidArgumentException('Unable to open CSV file.');
        }

        // Read first raw line to detect delimiter and check for 'sep=...'
        $firstLine = fgets($handle);
        if ($firstLine === false) {
            fclose($handle);
            throw new \InvalidArgumentException('The CSV file is empty.');
        }

        // Handle Excel's "sep=," or "sep=;" indicator
        $forcedDelimiter = null;
        if (preg_match('/^sep=([,;\t|])/i', trim($firstLine), $matches)) {
            $forcedDelimiter = $matches[1];
            // Next line will be the actual header
            $firstLine = fgets($handle);
            if ($firstLine === false) {
                fclose($handle);
                throw new \InvalidArgumentException('The CSV file is empty after separator indicator.');
            }
        }

        $delimiter = $forcedDelimiter;
        if (! $delimiter) {
            $delimiters = [',', ';', "\t", '|'];
            $delimiterCounts = [];
            foreach ($delimiters as $delim) {
                $delimiterCounts[$delim] = substr_count($firstLine, $delim);
            }
            arsort($delimiterCounts);
            $delimiter = key($delimiterCounts);
            if ($delimiterCounts[$delimiter] === 0) {
                $delimiter = ',';
            }
        }

        rewind($handle);
        // If there was a sep= line, skip it
        if ($forcedDelimiter) {
            fgets($handle);
        }

        // Read header line
        $rawHeader = fgetcsv($handle, 0, $delimiter);
        if (! $rawHeader || empty(array_filter($rawHeader))) {
            fclose($handle);
            throw new \InvalidArgumentException('The CSV file is empty or missing headers.');
        }

        // Clean UTF-8 BOM and whitespace from headers
        $rawHeader[0] = preg_replace('/^\xEF\xBB\xBF/', '', $rawHeader[0]);
        $headers = [];
        foreach ($rawHeader as $h) {
            $cleaned = trim(str_replace('"', '', (string) $h));
            if ($cleaned !== '') {
                $headers[] = $cleaned;
            }
        }

        $rows = [];
        $lineNumber = 1;

        while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
            $lineNumber++;

            if (count(array_filter($data, fn($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $rowData = [];
            foreach ($headers as $index => $header) {
                $rowData[$header] = isset($data[$index]) ? trim((string) $data[$index]) : '';
            }

            $rows[] = [
                'line' => $lineNumber,
                'data' => $rowData,
            ];
        }

        fclose($handle);

        return [
            'headers' => $headers,
            'rows'    => $rows,
        ];
    }
}
