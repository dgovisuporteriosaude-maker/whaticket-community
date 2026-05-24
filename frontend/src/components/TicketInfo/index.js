import React from "react";

import { Avatar, CardHeader, Chip } from "@material-ui/core";

import { i18n } from "../../translate/i18n";

const TicketInfo = ({ contact, ticket, onClick }) => {
	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer" }}
			titleTypographyProps={{ noWrap: true }}
			subheaderTypographyProps={{ noWrap: true }}
			avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" />}
			title={
				<span>
					{`${contact.name} #${ticket.id}`}
					{ticket.aiActive && (
						<Chip
							size="small"
							label="Atendimento com IA"
							style={{ marginLeft: 8, height: 22, background: "#263238", color: "#fff" }}
						/>
					)}
				</span>
			}
			subheader={
				ticket.user &&
				`${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
			}
		/>
	);
};

export default TicketInfo;
