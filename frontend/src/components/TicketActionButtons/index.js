import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	MenuItem,
	TextField,
	Checkbox,
	FormControlLabel
} from "@material-ui/core";
import { MoreVert, Replay } from "@material-ui/icons";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	actionButtons: {
		marginRight: 6,
		flex: "none",
		alignSelf: "center",
		marginLeft: "auto",
		"& > *": {
			margin: theme.spacing(1),
		},
	},
}));

const TicketActionButtons = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const [closingModalOpen, setClosingModalOpen] = useState(false);
	const [closingData, setClosingData] = useState({
		categoryId: "",
		closingReasonId: "",
		closingNote: "",
		sendFarewellMessage: false,
	});
	const [categories, setCategories] = useState([]);
	const [closingReasons, setClosingReasons] = useState([]);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
	};

	const handleUpdateTicketStatus = async (e, status, userId) => {
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: status,
				userId: userId || null,
				...(status === "closed" ? closingData : {}),
			});

			setLoading(false);
			setClosingModalOpen(false);
			if (status === "open") {
				history.push(`/tickets/${ticket.id}`);
			} else {
				history.push("/tickets");
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	const handleOpenClosingModal = async () => {
		setLoading(true);
		try {
			const [{ data: categoriesData }, { data: reasonsData }] = await Promise.all([
				api.get("/ticket-categories"),
				api.get("/closing-reasons"),
			]);

			setCategories(categoriesData);
			setClosingReasons(reasonsData);
			setClosingData({
				categoryId: "",
				closingReasonId: "",
				closingNote: "",
				sendFarewellMessage: false,
			});
			setClosingModalOpen(true);
		} catch (err) {
			toastError(err);
		} finally {
			setLoading(false);
		}
	};

	const handleClosingChange = event => {
		const { name, value, checked, type } = event.target;
		setClosingData(prev => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const canCloseTicket = closingData.categoryId && closingData.closingReasonId;

	return (
		<div className={classes.actionButtons}>
			{ticket.status === "closed" && (
				<ButtonWithSpinner
					loading={loading}
					startIcon={<Replay />}
					size="small"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.reopen")}
				</ButtonWithSpinner>
			)}
			{ticket.status === "open" && (
				<>
					<ButtonWithSpinner
						loading={loading}
						startIcon={<Replay />}
						size="small"
						onClick={e => handleUpdateTicketStatus(e, "pending", null)}
					>
						{i18n.t("messagesList.header.buttons.return")}
					</ButtonWithSpinner>
					<ButtonWithSpinner
						loading={loading}
						size="small"
						variant="contained"
						color="primary"
						onClick={handleOpenClosingModal}
					>
						{i18n.t("messagesList.header.buttons.resolve")}
					</ButtonWithSpinner>
					<IconButton onClick={handleOpenTicketOptionsMenu}>
						<MoreVert />
					</IconButton>
					<TicketOptionsMenu
						ticket={ticket}
						anchorEl={anchorEl}
						menuOpen={ticketOptionsMenuOpen}
						handleClose={handleCloseTicketOptionsMenu}
					/>
				</>
			)}
			{ticket.status === "pending" && (
				<ButtonWithSpinner
					loading={loading}
					size="small"
					variant="contained"
					color="primary"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.accept")}
				</ButtonWithSpinner>
			)}
			<Dialog
				open={closingModalOpen}
				onClose={() => setClosingModalOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Resolver chamado</DialogTitle>
				<DialogContent>
					<TextField
						select
						fullWidth
						required
						margin="dense"
						variant="outlined"
						label="Categoria"
						name="categoryId"
						value={closingData.categoryId}
						onChange={handleClosingChange}
					>
						{categories.map(category => (
							<MenuItem key={category.id} value={category.id}>
								{category.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						fullWidth
						required
						margin="dense"
						variant="outlined"
						label="Motivo de fechamento"
						name="closingReasonId"
						value={closingData.closingReasonId}
						onChange={handleClosingChange}
					>
						{closingReasons.map(reason => (
							<MenuItem key={reason.id} value={reason.id}>
								{reason.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						fullWidth
						margin="dense"
						variant="outlined"
						label="Observacao"
						name="closingNote"
						value={closingData.closingNote}
						onChange={handleClosingChange}
						multiline
						rows={3}
					/>
					<FormControlLabel
						control={
							<Checkbox
								color="primary"
								name="sendFarewellMessage"
								checked={closingData.sendFarewellMessage}
								onChange={handleClosingChange}
							/>
						}
						label="Enviar mensagem de encerramento"
					/>
				</DialogContent>
				<DialogActions>
					<ButtonWithSpinner
						size="small"
						onClick={() => setClosingModalOpen(false)}
					>
						Cancelar
					</ButtonWithSpinner>
					<ButtonWithSpinner
						loading={loading}
						size="small"
						variant="contained"
						color="primary"
						disabled={!canCloseTicket}
						onClick={e => handleUpdateTicketStatus(e, "closed", user?.id)}
					>
						Resolver
					</ButtonWithSpinner>
				</DialogActions>
			</Dialog>
		</div>
	);
};

export default TicketActionButtons;
