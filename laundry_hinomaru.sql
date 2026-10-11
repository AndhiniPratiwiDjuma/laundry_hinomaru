-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 11, 2026 at 08:25 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `laundry_hinomaru`
--

-- --------------------------------------------------------

--
-- Table structure for table `detail_pesanan`
--

CREATE TABLE `detail_pesanan` (
  `id` int(11) NOT NULL,
  `pesanan_id` int(11) NOT NULL,
  `layanan_id` int(11) NOT NULL,
  `jumlah` decimal(10,2) NOT NULL,
  `harga` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `detail_pesanan`
--

INSERT INTO `detail_pesanan` (`id`, `pesanan_id`, `layanan_id`, `jumlah`, `harga`, `subtotal`) VALUES
(2, 2, 5, 1.00, 15000.00, 15000.00);

-- --------------------------------------------------------

--
-- Table structure for table `kasir`
--

CREATE TABLE `kasir` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kasir`
--

INSERT INTO `kasir` (`id`, `nama`, `username`, `password`, `created_at`) VALUES
(1, 'Andhini', '02Andhini', '$2y$10$KOmduugJnEW5urFsK9Mnu.hkogYy7ai7O8RSVmMhaefWAHDiwfo0O', '2026-10-05 16:19:34'),
(2, 'sisi', '03sisi', '$2y$10$Chw3VxskRIkOvJxejLaxaecnMBMPBn6Q2b3wSo4yUN5HrzSObTLhS', '2026-10-05 16:21:24'),
(3, 'Admin 1', '001Admin', '$2y$10$zj77feVZ6vB/zi119KGNKudaib8lEGue05EsrPInjUo2fK1l.TAIa', '2026-10-06 23:03:54'),
(4, 'Andhini 1', '001Andhini', '$2y$10$S3Trf68oVnbT.xYBv3VTv.f6Tks4rr8ETGSlY.EH90W4udQHRoLJu', '2026-10-07 02:50:44'),
(5, 'Aufi', '002Aufi', '$2y$10$nGCmtWgMQXvb.VXL67Y/QukWVIV.cXOuFaBzjeHuCiZBwFf4K3pDu', '2026-10-07 02:52:23');

-- --------------------------------------------------------

--
-- Table structure for table `layanan`
--

CREATE TABLE `layanan` (
  `id` int(11) NOT NULL,
  `nama_layanan` varchar(100) NOT NULL,
  `harga` decimal(12,2) NOT NULL,
  `satuan` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `layanan`
--

INSERT INTO `layanan` (`id`, `nama_layanan`, `harga`, `satuan`, `created_at`) VALUES
(1, 'Cuci Kering + Setrika', 7000.00, 'kg', '2026-10-05 12:25:29'),
(2, 'Cuci Kering + Lipat', 4000.00, 'kg', '2026-10-05 12:25:29'),
(3, 'Cuci Kering', 3000.00, 'kg', '2026-10-05 12:25:29'),
(4, 'Setrika', 5000.00, 'kg', '2026-10-05 12:25:29'),
(5, 'Cuci Express 3 Jam', 15000.00, 'kg', '2026-10-05 12:25:29'),
(6, 'Cuci Express 6 Jam', 10000.00, 'kg', '2026-10-05 12:25:29'),
(7, 'Cuci Satuan', 10000.00, 'pcs', '2026-10-05 12:25:29'),
(8, 'Selimut Besar', 15000.00, 'pcs', '2026-10-05 12:25:29'),
(9, 'Selimut Kecil', 10000.00, 'pcs', '2026-10-05 12:25:29'),
(10, 'Sepray', 15000.00, 'pcs', '2026-10-05 12:25:29'),
(11, 'Handuk', 5000.00, 'pcs', '2026-10-05 12:25:29');

-- --------------------------------------------------------

--
-- Table structure for table `pesanan`
--

CREATE TABLE `pesanan` (
  `id` int(11) NOT NULL,
  `nomor_nota` varchar(30) NOT NULL,
  `kasir_id` int(11) DEFAULT NULL,
  `nama_pelanggan` varchar(100) NOT NULL,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('DIPROSES','SELESAI','DIAMBIL') NOT NULL DEFAULT 'DIPROSES',
  `tanggal` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pesanan`
--

INSERT INTO `pesanan` (`id`, `nomor_nota`, `kasir_id`, `nama_pelanggan`, `total`, `status`, `tanggal`) VALUES
(2, 'HN-20261007-001', 5, 'ica', 15000.00, 'DIPROSES', '2026-10-07 02:53:08');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `detail_pesanan`
--
ALTER TABLE `detail_pesanan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_detail_pesanan` (`pesanan_id`),
  ADD KEY `fk_detail_layanan` (`layanan_id`);

--
-- Indexes for table `kasir`
--
ALTER TABLE `kasir`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `layanan`
--
ALTER TABLE `layanan`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pesanan`
--
ALTER TABLE `pesanan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nomor_nota` (`nomor_nota`),
  ADD KEY `fk_pesanan_kasir` (`kasir_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `detail_pesanan`
--
ALTER TABLE `detail_pesanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `kasir`
--
ALTER TABLE `kasir`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `layanan`
--
ALTER TABLE `layanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `pesanan`
--
ALTER TABLE `pesanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `detail_pesanan`
--
ALTER TABLE `detail_pesanan`
  ADD CONSTRAINT `fk_detail_layanan` FOREIGN KEY (`layanan_id`) REFERENCES `layanan` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detail_pesanan` FOREIGN KEY (`pesanan_id`) REFERENCES `pesanan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pesanan`
--
ALTER TABLE `pesanan`
  ADD CONSTRAINT `fk_pesanan_kasir` FOREIGN KEY (`kasir_id`) REFERENCES `kasir` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
